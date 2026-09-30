import { test, expect } from "node:test";
import type { Store } from "../db.ts";
import type { ComputerAction, ComputerGateway, ComputerObservation } from "./computer-gateway.ts";
import type { ComputerProvider, ComputerHandle } from "./computer-provider.ts";
import { O1ComputerSessionService } from "./computer-sessions.ts";

class MemoryStore {
  private values = new Map<string, unknown>();
  async get<T>(owner: string, kind: string, id: string) { return (this.values.get(owner + ':' + kind + ':' + id) as T | undefined) ?? null; }
  async list<T>(owner: string, kind: string) { return [...this.values.entries()].filter(([key]) => key.startsWith(owner + ':' + kind + ':')).map(([, value]) => value as T); }
  async put<T extends { id: string }>(owner: string, kind: string, value: T) { this.values.set(owner + ':' + kind + ':' + value.id, value); return value; }
  async remove(owner: string, kind: string, id: string) { this.values.delete(owner + ':' + kind + ':' + id); }
}

const provider: ComputerProvider = {
  kind: "persistent",
  async create() { return { id: 'provider-1', kind: 'persistent', status: 'running' } satisfies ComputerHandle; },
  async get() { return { id: 'provider-1', kind: 'persistent', status: 'running' } satisfies ComputerHandle; },
  async start() {},
  async stop() {},
  async destroy() {},
};

let actions = 0;
const gateway: ComputerGateway = {
  async observe(computerId): Promise<ComputerObservation> { return { computerId, text: 'ok', at: new Date().toISOString() }; },
  async act(computerId, _action: ComputerAction): Promise<ComputerObservation> { actions += 1; return { computerId, text: 'acted', at: new Date().toISOString() }; },
};

test("reuses a completed computer operation instead of executing twice", async () => {
  const service = new O1ComputerSessionService(new MemoryStore() as unknown as Store, provider, gateway, true);
  const session = await service.create("owner", { name: "o1-test" });
  await service.act("owner", session.id, "op-1", { type: "key", key: "ENTER" });
  await service.act("owner", session.id, "op-1", { type: "key", key: "ENTER" });
  expect(actions).toBe(1);
});