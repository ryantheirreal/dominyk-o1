import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import type { BrowserService } from "../browser.ts";
import { O1BrowserActionService } from "./browser-actions.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
}

let inputCalls = 0;
const browser = {
  async input() { inputCalls += 1; return { id: 'browser-1', status: 'active' }; },
} as unknown as BrowserService;

test("reuses a successful browser action receipt", async () => {
  inputCalls = 0;
  const service = new O1BrowserActionService(new MemoryStore() as unknown as Store, browser);
  await service.execute('owner', 'browser-1', 'op-1', { type: 'click', x: 1, y: 2 });
  await service.execute('owner', 'browser-1', 'op-1', { type: 'click', x: 1, y: 2 });
  expect(inputCalls).toBe(1);
});