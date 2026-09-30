import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1SkillRegistry } from "./skill-registry.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([,v]) => v as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

test("installs and versions a workspace skill", async () => {
  const service = new O1SkillRegistry(new MemoryStore() as unknown as Store);
  const skill = await service.install("owner", { id: "research.v1", name: "Research", version: "1.0.0", description: "Research workflow", keywords: ["research"], dependencies: [], toolScopes: ["browser.read"], enabled: true });
  expect(skill.source).toBe("workspace");
  expect((await service.list("owner"))[0]?.version).toBe("1.0.0");
});

test("can disable a skill without deleting its version", async () => {
  const service = new O1SkillRegistry(new MemoryStore() as unknown as Store);
  await service.install("owner", { id: "browser.v1", name: "Browser", version: "1.0.0", description: "Browser workflow", keywords: ["browser"], dependencies: [], toolScopes: ["browser"], enabled: true });
  const updated = await service.enable("owner", "browser.v1", false);
  expect(updated.enabled).toBe(false);
});