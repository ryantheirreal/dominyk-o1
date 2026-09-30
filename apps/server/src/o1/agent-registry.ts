import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export type AgentStatus = "idle" | "working" | "waiting" | "verifying" | "blocked" | "recovered" | "completed";

export interface O1AgentDefinition {
  id: string;
  owner: string;
  name: string;
  role: string;
  objective: string;
  modelPolicy?: string;
  memoryScope: string;
  toolScopes: string[];
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export class O1AgentRegistry {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async create(owner: string, input: { id?: string; name: string; role: string; objective: string; modelPolicy?: string; memoryScope?: string; toolScopes?: string[] }) {
    const id = input.id ?? randomUUID();
    if (!input.name.trim() || !input.role.trim() || !input.objective.trim()) throw new Error("Agent name, role and objective are required");
    const existing = await this.db.get<O1AgentDefinition>(owner, "o1-agents", id);
    if (existing) throw new Error("Agent already exists");
    const now = new Date().toISOString();
    const agent: O1AgentDefinition = {
      id, owner, name: input.name.trim(), role: input.role.trim(), objective: input.objective.trim(),
      modelPolicy: input.modelPolicy, memoryScope: input.memoryScope ?? "project",
      toolScopes: input.toolScopes ?? [], status: "idle", createdAt: now, updatedAt: now,
    };
    await this.db.put(owner, "o1-agents", agent);
    await this.audit?.record({ owner, category: "system", action: "agent_created", targetId: id, data: { name: agent.name, role: agent.role, toolScopes: agent.toolScopes } });
    return agent;
  }

  list(owner: string) { return this.db.list<O1AgentDefinition>(owner, "o1-agents"); }

  async setStatus(owner: string, id: string, status: AgentStatus) {
    const agent = await this.db.get<O1AgentDefinition>(owner, "o1-agents", id);
    if (!agent) throw new Error("Agent not found");
    const updated = { ...agent, status, updatedAt: new Date().toISOString() };
    await this.db.put(owner, "o1-agents", updated);
    await this.audit?.record({ owner, category: "system", action: "agent_status", targetId: id, data: { from: agent.status, to: status } });
    return updated;
  }
}