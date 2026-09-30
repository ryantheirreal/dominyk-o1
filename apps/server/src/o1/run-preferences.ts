import type { Store } from "../db.ts";
import { O1EntitlementService } from "./entitlements.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";
import type { O1PlanModelId } from "../../../packages/domain/src/plans.ts";
import { routeModel } from "./model-router.ts";

export interface O1RunPreferences {
  id: "run-preferences";
  effort: number;
  modelId: O1PlanModelId;
  updatedAt: string;
}

export class O1RunPreferencesService {
  constructor(private readonly db: Store, private readonly entitlements: O1EntitlementService, private readonly audit?: O1AuditLedger) {}

  async get(owner: string) {
    const entitlement = await this.entitlements.get(owner);
    const stored = await this.db.get<O1RunPreferences>(owner, "o1-settings", "run-preferences");
    try {
      const route = routeModel({ planId: entitlement.plan.id, effort: stored?.effort ?? 1, modelId: stored?.modelId });
      return { id: "run-preferences" as const, effort: route.effort, modelId: route.modelId, updatedAt: stored?.updatedAt ?? new Date(0).toISOString() };
    } catch {
      const fallback = routeModel({ planId: entitlement.plan.id, effort: 1 });
      const value: O1RunPreferences = { id: "run-preferences", effort: fallback.effort, modelId: fallback.modelId, updatedAt: new Date().toISOString() };
      await this.db.put(owner, "o1-settings", value);
      await this.audit?.record({ owner, category: "model", action: "preferences_reset_after_entitlement_change", targetId: fallback.modelId, data: value });
      return value;
    }
  }

  async set(owner: string, input: { effort: number; modelId: string }) {
    const entitlement = await this.entitlements.get(owner);
    const route = routeModel({ planId: entitlement.plan.id, effort: input.effort, modelId: input.modelId });
    const value: O1RunPreferences = { id: "run-preferences", effort: route.effort, modelId: route.modelId, updatedAt: new Date().toISOString() };
    await this.db.put(owner, "o1-settings", value);
    await this.audit?.record({ owner, category: "model", action: "preferences_changed", targetId: route.modelId, data: route });
    return value;
  }
}