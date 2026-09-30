import { createHash, randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import type { ComputerAction, ComputerGateway, ComputerObservation } from "./computer-gateway.ts";
import type { ComputerProvider } from "./computer-provider.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface O1ComputerSession {
  id: string;
  owner: string;
  providerId: string;
  providerKind: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class O1ComputerSessionService {
  constructor(
    private readonly db: Store,
    private readonly provider?: ComputerProvider,
    private readonly gateway?: ComputerGateway,
    private readonly provisioningEnabled = false,
    private readonly audit?: O1AuditLedger,
  ) {}

  list(owner: string) { return this.db.list<O1ComputerSession>(owner, "o1-computers"); }

  async get(owner: string, id: string) {
    const session = await this.db.get<O1ComputerSession>(owner, "o1-computers", id);
    if (!session) throw new AppError("Computer session not found", 404);
    return session;
  }

  async create(owner: string, input: { name: string; image?: string; region?: string; size?: string }) {
    if (!this.provisioningEnabled) throw new AppError("Computer provisioning is disabled", 503);
    if (!this.provider) throw new AppError("No persistent computer provider is configured", 503);
    const handle = await this.provider.create({ owner, ...input });
    const now = new Date().toISOString();
    const session = await this.db.put(owner, 'o1-computers', {
      id: randomUUID(), owner, providerId: handle.id, providerKind: handle.kind,
      name: input.name.trim(), status: handle.status, createdAt: now, updatedAt: now,
    } as O1ComputerSession);
    await this.audit?.record({ owner, category: "computer", action: "provisioned", targetId: session.id, data: { providerKind: session.providerKind, name: session.name } });
    return session;
  }

  async sync(owner: string, id: string) {
    const session = await this.get(owner, id);
    if (!this.provider) throw new AppError("No persistent computer provider is configured", 503);
    const handle = await this.provider.get(session.providerId);
    return this.db.put(owner, 'o1-computers', { ...session, status: handle.status, updatedAt: new Date().toISOString() });
  }

  async start(owner: string, id: string) { return this.lifecycle(owner, id, "start"); }
  async stop(owner: string, id: string) { return this.lifecycle(owner, id, "stop"); }

  async destroy(owner: string, id: string) {
    const session = await this.get(owner, id);
    if (!this.provider) throw new AppError("No persistent computer provider is configured", 503);
    await this.provider.destroy(session.providerId);
    await this.db.remove(owner, "o1-computers", id);
    return { ok: true, id };
  }

  async observe(owner: string, id: string): Promise<ComputerObservation> {
    const session = await this.get(owner, id);
    if (!this.gateway) throw new AppError("No computer gateway is configured", 503);
    return this.gateway.observe(session.providerId);
  }

  async act(owner: string, id: string, operationId: string, action: ComputerAction): Promise<ComputerObservation> {
    const session = await this.get(owner, id);
    if (!this.gateway) throw new AppError("No computer gateway is configured", 503);
    if (!operationId.trim()) throw new AppError("operationId is required", 422);
    const hash = createHash("sha256").update(JSON.stringify(action)).digest("hex");
    const existing = await this.db.get<{
      id: string; owner: string; computerId: string; operationId: string; hash: string;
      status: "executing" | "succeeded" | "failed" | "outcome_unknown"; result?: ComputerObservation; error?: string;
    }>(owner, "o1-computer-actions", operationId);
    if (existing) {
      if (existing.hash !== hash || existing.computerId !== id)
        throw new AppError("Computer operationId was already used for a different action", 409);
      if (existing.status === "succeeded" && existing.result) return existing.result;
      if (existing.status === "outcome_unknown")
        throw new AppError("Computer operation outcome is unknown; inspect the current computer state before retrying", 409);
      if (existing.status === "executing")
        throw new AppError("Computer operation is already executing", 409);
    }
    const receipt = {
      id: operationId, owner, computerId: id, operationId, hash,
      status: "executing" as const, createdAt: new Date().toISOString(), action,
    };
    await this.db.put(owner, "o1-computer-actions", receipt);
    await this.audit?.record({ owner, category: "computer", action: "action_started", targetId: id, data: { operationId, action } });
    try {
      const result = await this.gateway.act(session.providerId, action);
      await this.db.put(owner, "o1-computer-actions", { ...receipt, status: "succeeded" as const, result });
      await this.audit?.record({ owner, category: "computer", action: "action_succeeded", targetId: id, data: { operationId, result } });
      return result;
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const status = name === "AbortError" || name === "TimeoutError" ? "outcome_unknown" as const : "failed" as const;
      await this.db.put(owner, "o1-computer-actions", { ...receipt, status, error: error instanceof Error ? error.message : "Computer action failed" });
      await this.audit?.record({ owner, category: "computer", action: status, targetId: id, data: { operationId, error: error instanceof Error ? error.message : "Computer action failed" } });
      throw error;
    }
  }

  private async lifecycle(owner: string, id: string, operation: "start" | "stop") {
    const session = await this.get(owner, id);
    if (!this.provider) throw new AppError("No persistent computer provider is configured", 503);
    await this.provider[operation](session.providerId);
    const status = operation === "start" ? "starting" : "stopping";
    const updated = await this.db.put(owner, 'o1-computers', { ...session, status, updatedAt: new Date().toISOString() });
    await this.audit?.record({ owner, category: "computer", action: operation, targetId: id });
    return updated;
  }
}