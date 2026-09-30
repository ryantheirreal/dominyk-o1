import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import type { ComputerAction, ComputerGateway, ComputerObservation } from "./computer-gateway.ts";
import type { ComputerProvider } from "./computer-provider.ts";

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
    return this.db.put(owner, 'o1-computers', {
      id: randomUUID(), owner, providerId: handle.id, providerKind: handle.kind,
      name: input.name.trim(), status: handle.status, createdAt: now, updatedAt: now,
    } as O1ComputerSession);
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

  async act(owner: string, id: string, action: ComputerAction): Promise<ComputerObservation> {
    const session = await this.get(owner, id);
    if (!this.gateway) throw new AppError("No computer gateway is configured", 503);
    return this.gateway.act(session.providerId, action);
  }

  private async lifecycle(owner: string, id: string, operation: "start" | "stop") {
    const session = await this.get(owner, id);
    if (!this.provider) throw new AppError("No persistent computer provider is configured", 503);
    await this.provider[operation](session.providerId);
    const status = operation === "start" ? "starting" : "stopping";
    return this.db.put(owner, 'o1-computers', { ...session, status, updatedAt: new Date().toISOString() });
  }
}