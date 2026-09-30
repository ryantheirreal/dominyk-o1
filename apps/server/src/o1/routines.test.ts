import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1RoutineService } from "./routines.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([, value]) => value as T); }
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("creates enabled event-driven routines", async () => {
  const service = new O1RoutineService(new MemoryStore() as unknown as Store);
  const routine = await service.create("owner", { id: "morning", name: "Morning", goal: "Review inbox", trigger: { type: "schedule", cron: "0 8 * * *" }, planId: "mini" });
  expect(routine.enabled).toBe(true);
});

test("can disable a routine without deleting it", async () => {
  const service = new O1RoutineService(new MemoryStore() as unknown as Store);
  await service.create("owner", { id: "watch", name: "Watch", goal: "Watch page", trigger: { type: "event", source: "slack", event: "message.created" }, planId: "agent-pro-plus" });
  expect((await service.setEnabled("owner", "watch", false)).enabled).toBe(false);
});