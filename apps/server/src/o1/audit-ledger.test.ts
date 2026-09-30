import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import { O1AuditLedger } from "./audit-ledger.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([, value]) => value as T); }
}

test("redacts secret-shaped keys before persisting audit data", async () => {
  const ledger = new O1AuditLedger(new MemoryStore() as unknown as Store);
  const event = await ledger.record({ owner: "owner", category: "connector", action: "proposed", data: { token: "secret", nested: { password: "pw" } } });
  expect(event.data).toEqual({ token: "[REDACTED]", nested: { password: "[REDACTED]" } });
  expect((await ledger.list("owner")).length).toBe(1);
});