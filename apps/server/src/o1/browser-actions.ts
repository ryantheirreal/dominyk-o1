import { createHash } from "node:crypto";
import type { BrowserService } from "../browser.ts";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface BrowserActionReceipt {
  id: string;
  owner: string;
  sessionId: string;
  hash: string;
  status: "executing" | "succeeded" | "failed" | "outcome_unknown";
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: string;
}

function uncertain(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  return name === "AbortError" || name === "TimeoutError";
}

export class O1BrowserActionService {
  constructor(private readonly db: Store, private readonly browser: BrowserService, private readonly audit?: O1AuditLedger) {}

  async execute(owner: string, sessionId: string, operationId: string, input: Record<string, unknown>) {
    if (!operationId.trim()) throw new AppError("operationId is required", 422);
    const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const existing = await this.db.get<BrowserActionReceipt>(owner, "o1-browser-actions", operationId);
    if (existing) {
      if (existing.hash !== hash || existing.sessionId !== sessionId) throw new AppError("Browser operationId was already used for a different action", 409);
      if (existing.status === "succeeded") return existing.result;
      if (existing.status === "outcome_unknown") throw new AppError("Browser operation outcome is unknown; inspect the current page before retrying", 409);
      if (existing.status === "executing") throw new AppError("Browser operation is already executing", 409);
    }
    const receipt: BrowserActionReceipt = { id: operationId, owner, sessionId, hash, status: "executing", input, createdAt: new Date().toISOString() };
    await this.db.put(owner, "o1-browser-actions", receipt);
    await this.audit?.record({ owner, category: "computer", action: "browser_action_started", targetId: sessionId, data: { operationId, input } });
    try {
      const result = await this.browser.input(owner, sessionId, input);
      await this.db.put(owner, "o1-browser-actions", { ...receipt, status: "succeeded" as const, result });
      await this.audit?.record({ owner, category: "computer", action: "browser_action_succeeded", targetId: sessionId, data: { operationId } });
      return result;
    } catch (error) {
      const status = uncertain(error) ? "outcome_unknown" as const : "failed" as const;
      await this.db.put(owner, "o1-browser-actions", { ...receipt, status, error: error instanceof Error ? error.message : "Browser action failed" });
      await this.audit?.record({ owner, category: "computer", action: status, targetId: sessionId, data: { operationId, error: error instanceof Error ? error.message : "Browser action failed" } });
      throw error;
    }
  }
}