import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export type O1MemoryScope = "session" | "conversation" | "task" | "project" | "user" | "skill" | "semantic" | "episodic";

export interface O1Memory {
  id: string;
  owner: string;
  scope: O1MemoryScope;
  text: string;
  source: string;
  confidence: number;
  relevance: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  provenance?: { type: string; ref?: string };
}

export class O1MemoryEngine {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async remember(input: { owner: string; scope: O1MemoryScope; text: string; source: string; confidence?: number; relevance?: number; provenance?: { type: string; ref?: string }; id?: string }) {
    const now = new Date().toISOString();
    const memory: O1Memory = {
      id: input.id ?? randomUUID(), owner: input.owner, scope: input.scope, text: input.text.trim(), source: input.source.trim(),
      confidence: Math.max(0, Math.min(1, input.confidence ?? 1)), relevance: Math.max(0, Math.min(1, input.relevance ?? 1)),
      createdAt: now, updatedAt: now, lastAccessedAt: now, provenance: input.provenance,
    };
    if (!memory.text || !memory.source) throw new Error("Memory text and source are required");
    await this.db.put(input.owner, "o1-memory", memory);
    await this.audit?.record({ owner: input.owner, category: "system", action: "memory_written", targetId: memory.id, data: { scope: memory.scope, confidence: memory.confidence, source: memory.source } });
    return memory;
  }

  async retrieve(owner: string, query: string, options: { scopes?: O1MemoryScope[]; limit?: number } = {}) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const memories = await this.db.list<O1Memory>(owner, "o1-memory");
    const filtered = memories.filter((memory) => !options.scopes?.length || options.scopes.includes(memory.scope));
    const selected = filtered
      .map((memory) => ({ memory, score: terms.length ? terms.reduce((score, term) => score + (memory.text.toLowerCase().includes(term) ? 2 : 0) + (memory.source.toLowerCase().includes(term) ? 1 : 0), 0) + memory.confidence + memory.relevance : memory.confidence + memory.relevance }))
      .sort((a, b) => b.score - a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt))
      .slice(0, Math.max(1, Math.min(options.limit ?? 12, 50)))
      .map((item) => ({ ...item.memory, lastAccessedAt: new Date().toISOString() }));
    await Promise.all(selected.map((memory) => this.db.put(owner, "o1-memory", memory)));
    return selected;
  }

  async forget(owner: string, id: string) {
    const memory = await this.db.get<O1Memory>(owner, "o1-memory", id);
    if (!memory) throw new Error("Memory not found");
    await this.db.remove(owner, "o1-memory", id);
    await this.audit?.record({ owner, category: "system", action: "memory_forgotten", targetId: id });
  }
}