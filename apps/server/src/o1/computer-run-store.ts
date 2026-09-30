import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import type { O1ComputerCall } from "./openai-computer-call.ts";

export type O1ComputerRunStatus = "running" | "waiting_approval" | "completed" | "exhausted" | "failed" | "outcome_unknown";

export interface O1ComputerRun {
  id: string;
  owner: string;
  computerId: string;
  prompt: string;
  responseId: string;
  callId?: string;
  turn: number;
  status: O1ComputerRunStatus;
  lastCall?: O1ComputerCall;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class O1ComputerRunStore {
  constructor(private readonly db: Store) {}

  async create(owner: string, input: { computerId: string; prompt: string; responseId: string; turn?: number }) {
    const now = new Date().toISOString();
    const run: O1ComputerRun = {
      id: randomUUID(), owner, computerId: input.computerId, prompt: input.prompt, responseId: input.responseId,
      turn: input.turn ?? 0, status: "running", createdAt: now, updatedAt: now,
    };
    return this.db.put(owner, "o1-computer-runs", run);
  }

  async get(owner: string, id: string) {
    return this.db.get<O1ComputerRun>(owner, "o1-computer-runs", id);
  }

  async update(owner: string, id: string, patch: Partial<Omit<O1ComputerRun, "id" | "owner" | "createdAt">>) {
    const current = await this.get(owner, id);
    if (!current) throw new Error("Computer run not found");
    return this.db.put(owner, 'o1-computer-runs', { ...current, ...patch, updatedAt: new Date().toISOString() });
  }

  list(owner: string) { return this.db.list<O1ComputerRun>(owner, "o1-computer-runs"); }
}