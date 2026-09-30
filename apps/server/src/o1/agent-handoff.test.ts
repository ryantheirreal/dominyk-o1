import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1HandoffService } from "./agent-handoff.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([k]) => k.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("creates an AI-to-agent handoff with durable state", async () => {
  const service = new O1HandoffService(new MemoryStore() as unknown as Store);
  const handoff = await service.create("owner", { id: "h1", source: "researcher", target: { type: "agent", agentId: "verifier" }, missionId: "m1", summary: "Verify findings", state: { facts: 3 } });
  expect(handoff.status).toBe("pending");
  expect((await service.transition("owner", "h1", "accepted")).status).toBe("accepted");
  expect((await service.transition("owner", "h1", "returned")).status).toBe("returned");
});

test("rejects invalid handoff transitions", async () => {
  const service = new O1HandoffService(new MemoryStore() as unknown as Store);
  await service.create("owner", { id: "h2", source: "researcher", target: { type: "human", reason: "Needs review" }, missionId: "m1", summary: "Review" });
  await expect(service.transition("owner", "h2", "returned")).rejects.toThrow(/Invalid handoff/);
});