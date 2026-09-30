import { createHash, randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import { ConnectorBus, type ConnectorOperation } from "./connector-bus.ts";
import { evaluatePermissionMode, normalizePermissionMode, type PermissionMode } from "./permissions.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface ConnectorAction {
  id: string;
  owner: string;
  operation: ConnectorOperation;
  payload: Record<string, unknown>;
  hash: string;
  status: "awaiting_review" | "executing" | "succeeded" | "failed" | "outcome_unknown" | "denied" | "expired";
  createdAt: string;
  expiresAt: string;
  result?: unknown;
  error?: string;
}


function isUncertainOutcome(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  return name === "AbortError" || name === "TimeoutError" || name === "ConnectTimeoutError";
}
export class ConnectorActionService {
  constructor(
    private readonly db: Store,
    private readonly bus: ConnectorBus,
    private readonly now = Date.now,
    private readonly audit?: O1AuditLedger,
  ) {}

  async propose(owner: string, operation: ConnectorOperation, payload: Record<string, unknown>, mode?: PermissionMode) {
    const settings = await this.db.get<{ id:string; mode?: string }>(owner,"o1-settings","permissions");
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
    await this.audit?.record({ owner, category: "connector", action: "proposed", targetId: id, data: { operation, payload, hash } });
    if (permission.decision === "allow") {
      try {
        const result=await this.bus.execute({ actorId:owner, operation, payload, approved:true });
        const succeeded={...action,status:"succeeded" as const,result};
        await this.audit?.record({ owner, category: "connector", action: "succeeded", targetId: id, data: { operation, result } });
        return this.db.put(owner,"o1-connector-actions",succeeded);
      } catch (error) {
        const uncertain=isUncertainOutcome(error);
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
      await this.audit?.record({ owner, category: "connector", action: "denied", targetId: id, data: { operation: action.operation } });
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
      await this.audit?.record({ owner, category: "connector", action: "succeeded", targetId: id, data: { operation: action.operation, result } });
      await this.db.put(owner,"o1-connector-actions",succeeded);
      return succeeded;
    } catch(error) {
      const uncertain=isUncertainOutcome(error);
      const failed={...executing,status:uncertain?"outcome_unknown" as const:"failed" as const,error:error instanceof Error?error.message:"Connector execution failed"};
      await this.audit?.record({ owner, category: "connector", action: failed.status, targetId: id, data: { operation: action.operation, error: failed.error } });
      await this.db.put(owner,"o1-connector-actions",failed);
      return failed;
    }
  }
}
