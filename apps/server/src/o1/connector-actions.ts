import { createHash, randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import { ConnectorBus, type ConnectorOperation } from "./connector-bus.ts";
import { evaluatePermissionMode, normalizePermissionMode, type PermissionMode, type LegacyPermissionMode } from "./permissions.ts";

export interface ConnectorAction {
  id: string;
  owner: string;
  operation: ConnectorOperation;
  payload: Record<string, unknown>;
  hash: string;
  status: "awaiting_review" | "executing" | "succeeded" | "failed" | "denied" | "expired";
  createdAt: string;
  expiresAt: string;
  result?: unknown;
  error?: string;
}

export class ConnectorActionService {
  constructor(
    private readonly db: Store,
    private readonly bus: ConnectorBus,
    private readonly now = Date.now,
  ) {}

  async propose(owner: string, operation: ConnectorOperation, payload: Record<string, unknown>, mode?: PermissionMode) {
    const settings = await this.db.get<{ id:string; mode:LegacyPermissionMode }>(owner,"o1-settings","permissions");
    mode = normalizePermissionMode(mode ?? settings?.mode);
    const id=randomUUID();
    const hash=createHash("sha256").update(JSON.stringify({ operation, payload })).digest("hex");
    const risk = operation.includes("send") ? "external" as const : "write" as const;
    const permission = evaluatePermissionMode(mode, risk);
    const action: ConnectorAction={
      id, owner, operation,
      payload,
      hash,
      status:permission.decision === "allow" ? "executing" : "awaiting_review",
      createdAt:new Date(this.now()).toISOString(),
      expiresAt:new Date(this.now()+30*60*1000).toISOString(),
    };
    await this.db.put(owner,"o1-connector-actions",action);
    if (permission.decision === "allow") {
      try {
        const result=await this.bus.execute({ actorId:owner, operation, payload, approved:true });
        return this.db.put(owner,"o1-connector-actions",{...action,status:"succeeded",result});
      } catch (error) {
        return this.db.put(owner,"o1-connector-actions",{...action,status:"failed",error:error instanceof Error?error.message:"Connector execution failed"});
      }
    }
    return action;
  }

  async decide(owner: string, id: string, hash: string, decision:"approve"|"deny") {
    const action=await this.db.get<ConnectorAction>(owner,"o1-connector-actions",id);
    if(!action) throw new AppError("Connector action not found",404);
    if(action.hash!==hash) throw new AppError("Connector action changed; review the latest proposal",409);
    if(action.status!=="awaiting_review") return action;
    if(Date.parse(action.expiresAt)<=this.now()) {
      const expired={...action,status:"expired" as const};
      await this.db.put(owner,"o1-connector-actions",expired);
      throw new AppError("Connector approval expired; create a fresh proposal",409);
    }
    if(decision==="deny") {
      const denied={...action,status:"denied" as const};
      await this.db.put(owner,"o1-connector-actions",denied);
      return denied;
    }
    const executing={...action,status:"executing" as const};
    await this.db.put(owner,"o1-connector-actions",executing);
    try {
      const result=await this.bus.execute({
        actorId:owner,
        operation:action.operation,
        payload:action.payload,
        approved:true,
      });
      const succeeded={...executing,status:"succeeded" as const,result};
      await this.db.put(owner,"o1-connector-actions",succeeded);
      return succeeded;
    } catch(error) {
      const failed={...executing,status:"failed" as const,error:error instanceof Error?error.message:"Connector execution failed"};
      await this.db.put(owner,"o1-connector-actions",failed);
      return failed;
    }
  }
}
