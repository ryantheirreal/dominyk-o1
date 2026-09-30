import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1ComputerRunStore } from "./computer-run-store.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("upsert creates then updates a computer run without changing its id or owner", async () => {
  const service = new O1ComputerRunStore(new MemoryStore() as unknown as Store);
  await service.upsert("owner", "run-1", { computerId: "pc-1", prompt: "work", responseId: "r1", turn: 0, status: "running" });
  const updated = await service.upsert("owner", "run-1", { computerId: "pc-1", prompt: "work", responseId: "r2", turn: 1, status: "waiting_approval" });
  expect(updated.id).toBe("run-1");
  expect(updated.responseId).toBe("r2");
  expect(updated.status).toBe("waiting_approval");
});