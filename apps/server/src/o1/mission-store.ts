import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import { MissionGovernor, type MissionCheckpoint, type MissionStatus } from "./mission-governor.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface StoredMission extends MissionCheckpoint {
  id: string;
  owner: string;
  goal: string;
  budget?: { maxSteps?: number; maxCost?: number; maxRuntimeMs?: number };
}

export class O1MissionStore {
  constructor(private readonly db: Store, private readonly governor = new MissionGovernor(), private readonly audit?: O1AuditLedger) {}

  async create(owner: string, input: { id?: string; goal: string; budget?: StoredMission['budget'] }) {
    const id = input.id ?? randomUUID();
    const mission: StoredMission = {
      id, owner, goal: input.goal.trim(), budget: input.budget, status: 'planned',
      phaseIndex: 0, completedSteps: 0, estimatedCost: 0, updatedAt: new Date().toISOString(),
    };
    if (!mission.goal) throw new AppError("Mission goal is required", 422);
    const existing = await this.db.get<StoredMission>(owner, 'o1-missions', id);
    if (existing) throw new AppError("Mission already exists", 409);
    await this.db.put(owner, "o1-missions", mission);
    await this.audit?.record({ owner, category: "mission", action: "created", targetId: id, data: { goal: mission.goal, budget: mission.budget } });
    return mission;
  }

  get(owner: string, id: string) {
    return this.db.get<StoredMission>(owner, "o1-missions", id);
  }

  list(owner: string) {
    return this.db.list<StoredMission>(owner, "o1-missions");
  }

  async transition(owner: string, id: string, next: MissionStatus) {
    const current = await this.get(owner, id);
    if (!current) throw new AppError("Mission not found", 404);
    const updated = this.governor.transition(current, next);
    const claimed = await this.db.compareAndSwap<StoredMission>(
      owner, 'o1-missions', id, { status: current.status, updatedAt: current.updatedAt }, updated,
    );
    if (!claimed) throw new AppError("Mission changed concurrently; reload and retry", 409);
    await this.audit?.record({ owner, category: "mission", action: "transitioned", targetId: id, data: { from: current.status, to: next } });
    return claimed;
  }

  async checkpoint(owner: string, id: string, patch: Partial<Pick<MissionCheckpoint, 'phaseIndex' | 'completedSteps' | 'estimatedCost'>>) {
    const current = await this.get(owner, id);
    if (!current) throw new AppError("Mission not found", 404);
    if (!this.governor.withinBudget(current, current.budget))
      throw new AppError("Mission budget exhausted", 409);
    const updated = this.governor.checkpoint(current, patch);
    const claimed = await this.db.compareAndSwap<StoredMission>(
      owner, 'o1-missions', id, { status: current.status, updatedAt: current.updatedAt }, updated,
    );
    if (!claimed) throw new AppError("Mission changed concurrently; reload and retry", 409);
    await this.audit?.record({ owner, category: "mission", action: "checkpointed", targetId: id, data: patch });
    return claimed;
  }
}