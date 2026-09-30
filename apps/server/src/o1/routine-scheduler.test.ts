import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1RoutineScheduler } from "./routine-scheduler.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async scan<T>(kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith('owner:' + kind + ':')).map(([,value]) => ({ owner: 'owner', value: value as T })); }
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("turns a due scheduled routine into a durable task", async () => {
  let now = Date.parse('2026-09-30T15:00:00.000Z');
  const db = new MemoryStore();
  await db.put("owner", "o1-routines", { id: "r1", owner: "owner", name: "Morning", goal: "Review", trigger: { type: "schedule", cron: "0 15 * * *" }, planId: "mini", enabled: true, nextRunAt: new Date(now - 1000).toISOString(), createdAt: new Date(now - 10000).toISOString(), updatedAt: new Date(now - 10000).toISOString() });
  const tasks: unknown[] = [];
  const agent = { async createTask(_owner: string, input: unknown, key: string) { tasks.push({ input, key }); return { id: key }; } };
  const scheduler = new O1RoutineScheduler(db as unknown as Store, agent as never, undefined, () => now);
  await scheduler.tick();
  expect(tasks).toHaveLength(1);
  expect((tasks[0] as { key: string }).key).toContain("routine:r1");
  expect((await db.list<any>("owner", "o1-routines"))[0]?.nextRunAt).toBeUndefined();
});