import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1AgentRegistry } from "./agent-registry.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([, value]) => value as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("persists an agent identity independently of chat", async () => {
  const registry = new O1AgentRegistry(new MemoryStore() as unknown as Store);
  const agent = await registry.create("owner", { id: "researcher", name: "Research", role: "researcher", objective: "Find evidence", toolScopes: ["browser.read"] });
  expect(agent.status).toBe("idle");
  expect((await registry.list("owner"))[0]?.role).toBe("researcher");
});

test("records status transitions at the registry seam", async () => {
  const registry = new O1AgentRegistry(new MemoryStore() as unknown as Store);
  await registry.create("owner", { id: "coder", name: "Coder", role: "coder", objective: "Build" });
  const updated = await registry.setStatus("owner", "coder", "working");
  expect(updated.status).toBe("working");
});