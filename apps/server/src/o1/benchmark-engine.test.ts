import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1BenchmarkEngine } from "./benchmark-engine.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("computes completion and verification rates from recorded tasks", async () => {
  const engine = new O1BenchmarkEngine(new MemoryStore() as unknown as Store);
  await engine.record({ id: "1", owner: "owner", suite: "browser", taskId: "a", success: true, verified: true, durationMs: 1000, interventions: 0, recoveryCount: 0 });
  await engine.record({ id: "2", owner: "owner", suite: "browser", taskId: "b", success: false, verified: false, durationMs: 3000, interventions: 1, recoveryCount: 1 });
  const summary = await engine.summary("owner", "browser");
  expect(summary.runs).toBe(2);
  expect(summary.completionRate).toBe(0.5);
  expect(summary.verificationRate).toBe(0.5);
  expect(summary.averageDurationMs).toBe(2000);
});