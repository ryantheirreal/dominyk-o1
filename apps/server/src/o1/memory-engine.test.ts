import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1MemoryEngine } from "./memory-engine.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,value]) => value as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async remove(owner: string, kind: string, id: string) { this.values.delete(owner + ':' + kind + ':' + id); }
}

test("retrieves relevant memory while preserving scope", async () => {
  const engine = new O1MemoryEngine(new MemoryStore() as unknown as Store);
  await engine.remember({ owner: "owner", scope: "project", text: "Use Supabase for storage", source: "project-rule", confidence: 0.9, relevance: 0.8 });
  await engine.remember({ owner: "owner", scope: "user", text: "Prefers concise output", source: "user-feedback", confidence: 0.7, relevance: 0.6 });
  const result = await engine.retrieve("owner", "Supabase storage", { scopes: ["project"] });
  expect(result).toHaveLength(1);
  expect(result[0]?.text).toContain("Supabase");
});

test("forgets memory by stable id", async () => {
  const engine = new O1MemoryEngine(new MemoryStore() as unknown as Store);
  const value = await engine.remember({ owner: "owner", scope: "task", text: "Temporary", source: "task" });
  await engine.forget("owner", value.id);
  expect(await engine.retrieve("owner", "Temporary")).toHaveLength(0);
});