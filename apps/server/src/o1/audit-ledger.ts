import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { redactSecrets } from "./policy.ts";

export type O1AuditCategory = "mission" | "computer" | "connector" | "permission" | "model" | "system";

export interface O1AuditEvent {
  id: string;
  owner: string;
  category: O1AuditCategory;
  action: string;
  targetId?: string;
  at: string;
  data?: unknown;
}

export class O1AuditLedger {
  constructor(private readonly db: Store) {}

  async record(input: { owner: string; category: O1AuditCategory; action: string; targetId?: string; data?: unknown }) {
    const event: O1AuditEvent = {
      id: randomUUID(),
      owner: input.owner,
      category: input.category,
      action: input.action,
      ...(input.targetId ? { targetId: input.targetId } : {}),
      at: new Date().toISOString(),
      ...(input.data === undefined ? {} : { data: redactSecrets(input.data) }),
    };
    return this.db.insertIfAbsent(input.owner, "o1-audit", event);
  }

  async list(owner: string, limit = 200) {
    const events = await this.db.list<O1AuditEvent>(owner, "o1-audit");
    return events.slice(0, Math.max(1, Math.min(limit, 500)));
  }
}