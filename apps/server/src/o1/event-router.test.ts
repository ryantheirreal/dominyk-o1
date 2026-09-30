import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1EventRouter } from "./event-router.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,value]) => value as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
}

test("queues one routine delivery and deduplicates duplicate events", async () => {
  const db = new MemoryStore();
  await db.put("owner", "o1-routines", { id: "r1", owner: "owner", name: "Watch", goal: "Run", trigger: { type: "event", source: "github", event: "push" }, planId: "mini", enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const router = new O1EventRouter(db as unknown as Store);
  const event = { source: "github", event: "push", payload: { repo: "o1" }, at: "2026-09-30T13:00:00.000Z" };
  expect(await router.dispatch("owner", event)).toHaveLength(1);
  expect(await router.dispatch("owner", event)).toHaveLength(0);
});