import { test, expect } from "node:test";
import { O1MissionStore } from "./mission-store.ts";
import type { Store } from "../db.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string): Promise<T | null> { return (this.values.get(`${owner}:${kind}:${id}`) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string): Promise<T[]> { return [...this.values.entries()].filter(([k]) => k.startsWith(`${owner}:${kind}:`)).map(([, v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T): Promise<T> { this.values.set(`${owner}:${kind}:${value.id}`, value); return value; }
  async compareAndSwap<T>(owner: string, kind: string, id: string, expected: Record<string, unknown>, patch: Record<string, unknown>): Promise<T | null> {
    const key=`${owner}:${kind}:${id}`; const current=this.values.get(key) as Record<string, unknown> | undefined;
    if (!current || Object.entries(expected).some(([k,v]) => current[k] !== v)) return null;
    const next={...current,...patch}; this.values.set(key,next); return next as T;
  }
}

test("creates and persists a mission", async () => {
  const store = new O1MissionStore(new MemoryStore() as unknown as Store);
  const mission = await store.create("owner", { id: "m1", goal: "Build O1", budget: { maxSteps: 10 } });
  expect((await store.get("owner", "m1"))?.goal).toBe("Build O1");
  expect(mission.status).toBe("planned");
});

test("persists valid transitions and rejects invalid ones", async () => {
  const store = new O1MissionStore(new MemoryStore() as unknown as Store);
  await store.create("owner", { id: "m2", goal: "Run" });
  expect((await store.transition("owner", "m2", "queued")).status).toBe("queued");
  await expect(store.transition("owner", "m2", "succeeded")).rejects.toThrow(/Invalid mission transition/);
});