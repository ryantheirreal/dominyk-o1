import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export type O1HandoffTarget = { type: "agent"; agentId: string } | { type: "human"; reason: string };
export interface O1Handoff {
  id: string;
  owner: string;
  source: string;
  target: O1HandoffTarget;
  missionId: string;
  summary: string;
  state: Record<string, unknown>;
  status: "pending" | "accepted" | "returned" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export class O1HandoffService {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async create(owner: string, input: { id: string; source: string; target: O1HandoffTarget; missionId: string; summary: string; state?: Record<string, unknown> }) {
    const now = new Date().toISOString();
    const handoff: O1Handoff = { ...input, owner, state: input.state ?? {}, status: "pending", createdAt: now, updatedAt: now };
    await this.db.put(owner, "o1-handoffs", handoff);
    await this.audit?.record({ owner, category: "mission", action: "handoff_created", targetId: handoff.id, data: { source: handoff.source, target: handoff.target, missionId: handoff.missionId } });
    return handoff;
  }

  async transition(owner: string, id: string, status: Extract<O1Handoff['status'], 'accepted' | 'returned' | 'cancelled'>) {
    const current = await this.db.get<O1Handoff>(owner, "o1-handoffs", id);
    if (!current) throw new Error("Handoff not found");
    if (current.status !== "pending" && !(current.status === "accepted" && status === "returned")) throw new Error("Invalid handoff transition");
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    await this.db.put(owner, "o1-handoffs", updated);
    await this.audit?.record({ owner, category: "mission", action: "handoff_" + status, targetId: id, data: { missionId: current.missionId } });
    return updated;
  }

  list(owner: string) { return this.db.list<O1Handoff>(owner, "o1-handoffs"); }
}