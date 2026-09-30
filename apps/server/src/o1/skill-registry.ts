import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface O1SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  keywords: string[];
  dependencies: string[];
  toolScopes: string[];
  enabled: boolean;
}

export interface O1SkillBinding extends O1SkillDefinition {
  owner: string;
  source: "system" | "workspace";
  installedAt: string;
  updatedAt: string;
}

export class O1SkillRegistry {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async install(owner: string, input: O1SkillDefinition, source: O1SkillBinding["source"] = "workspace") {
    const now = new Date().toISOString();
    const binding: O1SkillBinding = { ...input, owner, source, installedAt: now, updatedAt: now };
    await this.db.put(owner, "o1-skills", binding);
    await this.audit?.record({ owner, category: "system", action: "skill_installed", targetId: input.id, data: { version: input.version, source } });
    return binding;
  }

  async get(owner: string, id: string) {
    return this.db.get<O1SkillBinding>(owner, "o1-skills", id);
  }

  async list(owner: string) {
    return this.db.list<O1SkillBinding>(owner, "o1-skills");
  }

  async enable(owner: string, id: string, enabled: boolean) {
    const current = await this.get(owner, id);
    if (!current) throw new Error("Skill not found");
    const updated = { ...current, enabled, updatedAt: new Date().toISOString() };
    await this.db.put(owner, "o1-skills", updated);
    await this.audit?.record({ owner, category: "system", action: enabled ? "skill_enabled" : "skill_disabled", targetId: id });
    return updated;
  }
}