import { O1_PLANS, type O1PlanId, type O1PlanModelId } from "../../../packages/domain/src/plans.ts";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";

export interface O1EntitlementState {
  id: "entitlements";
  planId: O1PlanId;
  updatedAt: string;
}

export class O1EntitlementService {
  constructor(private readonly db: Store) {}

  async get(owner: string): Promise<O1EntitlementState & { plan: (typeof O1_PLANS)[number] }> {
    const stored = await this.db.get<O1EntitlementState>(owner, "o1-settings", "entitlements");
    const planId = stored?.planId ?? "mini";
    const plan = O1_PLANS.find((item) => item.id === planId) ?? O1_PLANS[0];
    return {
      id: "entitlements",
      planId: plan.id,
      updatedAt: stored?.updatedAt ?? new Date(0).toISOString(),
      plan,
    };
  }

  async set(owner: string, planId: O1PlanId) {
    const plan = O1_PLANS.find((item) => item.id === planId);
    if (!plan) throw new AppError("Unknown O1 plan", 422);
    return this.db.put(owner, "o1-settings", {
      id: "entitlements",
      planId: plan.id,
      updatedAt: new Date().toISOString(),
    });
  }

  async assertModel(owner: string, modelId: O1PlanModelId) {
    const state = await this.get(owner);
    if (!state.plan.models.some((model) => model.id === modelId))
      throw new AppError(`Model ${modelId} is not included in the ${state.plan.name} plan`, 403);
    return state;
  }

  async assertEffort(owner: string, effort: number) {
    const state = await this.get(owner);
    if (!Number.isInteger(effort) || effort < 1 || effort > state.plan.totalEfforts)
      throw new AppError("Invalid effort level", 422);
    if (effort > state.plan.unlockedEfforts)
      throw new AppError(`Effort ${effort} is not unlocked for the ${state.plan.name} plan`, 403);
    return state;
  }
}