import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1RoutineDispatcher } from "./routine-dispatcher.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,value]) => value as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("turns a matching routine event into one durable task", async () => {
  const db = new MemoryStore();
  await db.put("owner", "o1-routines", { id: "r1", owner: "owner", name: "Watch", goal: "Review push", trigger: { type: "event", source: "github", event: "push" }, planId: "mini", enabled: true });
  const created: unknown[] = [];
  const agent = { async createTask(_owner: string, task: unknown) { created.push(task); return { id: "task-1" }; } };
  const dispatcher = new O1RoutineDispatcher(db as unknown as Store, agent as never);
  const tasks = await dispatcher.dispatchEvent("owner", { source: "github", event: "push", payload: { ref: "main" }, at: "2026-09-30T14:00:00.000Z" });
  expect(tasks).toHaveLength(1);
  expect((created[0] as { prompt: string }).prompt).toContain("Review push");
});