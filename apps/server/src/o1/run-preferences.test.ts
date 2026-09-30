import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1EntitlementService } from "./entitlements.ts";
import { O1RunPreferencesService } from "./run-preferences.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([, v]) => v as T); }
}

test("defaults to the first model and first effort", async () => {
  const store = new MemoryStore();
  const service = new O1RunPreferencesService(store as unknown as Store, new O1EntitlementService(store as unknown as Store));
  const value = await service.get('owner');
  expect(value.modelId).toBe("dominyk-aether-1");
  expect(value.effort).toBe(1);
});

test("cannot persist a locked effort or out-of-plan model", async () => {
  const store = new MemoryStore();
  const service = new O1RunPreferencesService(store as unknown as Store, new O1EntitlementService(store as unknown as Store));
  await expect(service.set("owner", { effort: 2, modelId: "dominyk-aether-1" })).rejects.toThrow(/not unlocked/);
  await expect(service.set("owner", { effort: 1, modelId: "dominyk-max-1" })).rejects.toThrow(/not included/);
});