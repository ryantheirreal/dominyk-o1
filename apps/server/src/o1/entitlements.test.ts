import { test, expect } from "node:test";
import { O1_PLANS } from "../../../../packages/domain/src/plans.ts";
import type { Store } from "../db.ts";
import { O1EntitlementService } from "./entitlements.ts";

class MemoryStore implements Store {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, collection: string, id: string): Promise<T | null> {
    return (this.values.get(`${owner}:${collection}:${id}`) as T | undefined) ?? null;
  }
  async put<T extends { id: string }>(owner: string, collection: string, value: T): Promise<T> {
    this.values.set(`${owner}:${collection}:${value.id}`, value);
    return value;
  }
  async list<T>(owner: string, collection: string): Promise<T[]> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(`${owner}:${collection}:`))
      .map(([, value]) => value as T);
  }
  async insertIfAbsent<T extends { id: string }>(owner: string, collection: string, value: T): Promise<T> {
    const key = `${owner}:${collection}:${value.id}`;
    if (!this.values.has(key)) this.values.set(key, value);
    return this.values.get(key) as T;
  }
}

test("defaults to Mini and exposes its entitlements", async () => {
  const service = new O1EntitlementService(new MemoryStore());
  const state = await service.get("owner");
  expect(state.planId).toBe("mini");
  expect(state.plan.models).toEqual(O1_PLANS[0].models);
  expect(state.plan.unlockedEfforts).toBe(1);
});

test("enforces model access", async () => {
  const service = new O1EntitlementService(new MemoryStore());
  await expect(service.assertModel("owner", "dominyk-aether-1")).resolves.toBeTruthy();
  await expect(service.assertModel("owner", "dominyk-max-1")).rejects.toThrow(/not included/);
});

test("enforces effort access", async () => {
  const service = new O1EntitlementService(new MemoryStore());
  await expect(service.assertEffort("owner", 1)).resolves.toBeTruthy();
  await expect(service.assertEffort("owner", 2)).rejects.toThrow(/not unlocked/);
});

test("supports a provisioned Max 20x plan", async () => {
  const store = new MemoryStore();
  const service = new O1EntitlementService(store);
  await service.set("owner", "max-20x");
  const state = await service.get("owner");
  expect(state.planId).toBe("max-20x");
  await expect(service.assertModel("owner", "dominyk-max-1")).resolves.toBeTruthy();
  await expect(service.assertEffort("owner", 3)).resolves.toBeTruthy();
});