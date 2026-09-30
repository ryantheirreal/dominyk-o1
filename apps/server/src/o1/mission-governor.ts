export type MissionStatus =
  | "planned"
  | "queued"
  | "running"
  | "waiting_input"
  | "waiting_approval"
  | "verifying"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "recovering"
  | "unknown_outcome";

const transitions: Record<MissionStatus, readonly MissionStatus[]> = {
  planned: ["queued", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["waiting_input", "waiting_approval", "verifying", "failed", "recovering", "cancelled"],
  waiting_input: ["running", "cancelled"],
  waiting_approval: ["running", "cancelled"],
  verifying: ["running", "succeeded", "failed", "unknown_outcome"],
  recovering: ["queued", "running", "unknown_outcome", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
  unknown_outcome: ["recovering", "cancelled"],
};

export interface MissionCheckpoint {
  missionId: string;
  status: MissionStatus;
  phaseIndex: number;
  completedSteps: number;
  estimatedCost: number;
  updatedAt: string;
}

export function canTransition(from: MissionStatus, to: MissionStatus) {
  return transitions[from].includes(to);
}

export class MissionGovernor {
  transition(state: MissionCheckpoint, next: MissionStatus): MissionCheckpoint {
    if (!canTransition(state.status, next)) throw new Error(`Invalid mission transition: ${state.status} -> ${next}`);
    return { ...state, status: next, updatedAt: new Date().toISOString() };
  }

  checkpoint(state: MissionCheckpoint, patch: Partial<Pick<MissionCheckpoint, "phaseIndex" | "completedSteps" | "estimatedCost">>) {
    if (patch.phaseIndex !== undefined && (!Number.isInteger(patch.phaseIndex) || patch.phaseIndex < 0))
      throw new Error("phaseIndex must be a non-negative integer");
    if (patch.completedSteps !== undefined && (!Number.isInteger(patch.completedSteps) || patch.completedSteps < 0))
      throw new Error("completedSteps must be a non-negative integer");
    if (patch.estimatedCost !== undefined && (!Number.isFinite(patch.estimatedCost) || patch.estimatedCost < 0))
      throw new Error("estimatedCost must be a non-negative number");
    return { ...state, ...patch, updatedAt: new Date().toISOString() };
  }

  withinBudget(state: MissionCheckpoint, budget?: { maxSteps?: number; maxCost?: number }) {
    if (budget?.maxSteps !== undefined && state.completedSteps >= budget.maxSteps) return false;
    if (budget?.maxCost !== undefined && state.estimatedCost >= budget.maxCost) return false;
    return true;
  }
}