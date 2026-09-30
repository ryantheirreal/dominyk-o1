import { O1_PLANS } from "../../../packages/domain/src/plans.ts";

export interface O1ModelCatalogEntry {
  id: string;
  name: string;
  readiness: "catalogued" | "configured";
}

export function modelCatalog(): O1ModelCatalogEntry[] {
  const seen = new Set<string>();
  const entries: O1ModelCatalogEntry[] = [];
  for (const plan of O1_PLANS) {
    for (const model of plan.models) {
      if (seen.has(model.id)) continue;
      seen.add(model.id);
      entries.push({ id: model.id, name: model.name, readiness: "catalogued" });
    }
  }
  return entries;
}