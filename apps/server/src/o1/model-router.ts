import { getO1Plan, type O1PlanId, type O1PlanModelId } from "../../../packages/domain/src/plans.ts";
import { AppError } from "../errors.ts";

export interface ModelRouteRequest {
  planId: O1PlanId;
  effort: number;
  modelId?: O1PlanModelId;
  complexity?: number;
}

export interface ModelRoute {
  planId: O1PlanId;
  modelId: O1PlanModelId;
  effort: number;
  reason: "requested" | "plan-default";
}

export function routeModel(input: ModelRouteRequest): ModelRoute {
  const plan = getO1Plan(input.planId);
  if (!Number.isInteger(input.effort) || input.effort < 1 || input.effort > plan.unlockedEfforts)
    throw new AppError(`Effort ${input.effort} is not unlocked for the ${plan.name} plan`, 403);
  if (input.modelId) {
    const requested = plan.models.find((model) => model.id === input.modelId);
    if (!requested) throw new AppError(`Model ${input.modelId} is not included in the ${plan.name} plan`, 403);
    return { planId: plan.id, modelId: requested.id, effort: input.effort, reason: "requested" };
  }
  const fallback = plan.models[0];
  return { planId: plan.id, modelId: fallback.id, effort: input.effort, reason: "plan-default" };
}