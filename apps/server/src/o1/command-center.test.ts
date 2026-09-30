import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1CommandCenterService } from "./command-center.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  seed(owner: string, kind: string, value: { id: string; [key: string]: unknown }) { this.values.set(owner + ':' + kind + ':' + value.id, value); }
}

test("aggregates active missions, agents, computers and approvals", async () => {
  const db = new MemoryStore();
  db.seed("owner", "o1-missions", { id: "m1", status: "running" });
  db.seed("owner", "o1-agents", { id: "a1", status: "working" });
  db.seed("owner", "o1-computers", { id: "pc1", status: "running" });
  db.seed("owner", "o1-routines", { id: "r1", enabled: true });
  db.seed("owner", "o1-connector-actions", { id: "c1", status: "awaiting_review" });
  const snapshot = await new O1CommandCenterService(db as unknown as Store).snapshot('owner');
  expect(snapshot.counts.activeMissions).toBe(1);
  expect(snapshot.counts.activeAgents).toBe(1);
  expect(snapshot.counts.activeComputers).toBe(1);
  expect(snapshot.counts.pendingApprovals).toBe(1);
  expect(snapshot.counts.enabledRoutines).toBe(1);
});