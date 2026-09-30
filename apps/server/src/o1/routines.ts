import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";
import type { O1PlanId } from "../../../packages/domain/src/plans.ts";

export type RoutineTrigger =
  | { type: "schedule"; cron: string }
  | { type: "webhook"; key: string }
  | { type: "event"; source: string; event: string };

export interface O1Routine {
  id: string;
  owner: string;
  name: string;
  goal: string;
  trigger: RoutineTrigger;
  planId: O1PlanId;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class O1RoutineService {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async create(owner: string, input: { id: string; name: string; goal: string; trigger: RoutineTrigger; planId: O1PlanId }) {
    const now = new Date().toISOString();
    const routine: O1Routine = { ...input, owner, enabled: true, createdAt: now, updatedAt: now };
    if (!routine.name.trim() || !routine.goal.trim()) throw new Error("Routine name and goal are required");
    await this.db.put(owner, "o1-routines", routine);
    await this.audit?.record({ owner, category: "system", action: "routine_created", targetId: routine.id, data: { name: routine.name, trigger: routine.trigger } });
    return routine;
  }

  async setEnabled(owner: string, id: string, enabled: boolean) {
    const routine = await this.db.get<O1Routine>(owner, "o1-routines", id);
    if (!routine) throw new Error("Routine not found");
    const updated = { ...routine, enabled, updatedAt: new Date().toISOString() };
    await this.db.put(owner, "o1-routines", updated);
    await this.audit?.record({ owner, category: "system", action: enabled ? "routine_enabled" : "routine_disabled", targetId: id });
    return updated;
  }

  list(owner: string) { return this.db.list<O1Routine>(owner, "o1-routines"); }
}