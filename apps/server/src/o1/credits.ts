import { randomUUID } from "node:crypto";
import type { Store } from "../db.ts";
import { AppError } from "../errors.ts";

export interface CreditState {
  id: "credits";
  balance: number;
  totalGranted: number;
  totalSpent: number;
  updatedAt: string;
}
export interface CreditEntry {
  id: string;
  kind: "grant" | "debit";
  amount: number;
  reason: string;
  createdAt: string;
}

export class CreditLedger {
  constructor(
    private readonly db: Store,
    private readonly now = Date.now,
  ) {}
  async get(owner: string): Promise<CreditState> {
    const saved = await this.db.get<CreditState>(owner, "o1-settings", "credits");
    return (
      saved ?? {
        id: "credits",
        balance: 100,
        totalGranted: 100,
        totalSpent: 0,
        updatedAt: new Date(0).toISOString(),
      }
    );
  }
  async debit(owner: string, amount: number, reason: string) {
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000)
      throw new AppError("Crédito inválido", 422);
    const state = await this.get(owner);
    if (state.balance < amount) throw new AppError("Créditos insuficientes", 409);
    const next = {
      ...state,
      balance: state.balance - amount,
      totalSpent: state.totalSpent + amount,
      updatedAt: new Date(this.now()).toISOString(),
    };
    await this.db.put(owner, "o1-settings", next);
    await this.db.put(owner, "o1-credit-ledger", {
      id: randomUUID(),
      kind: "debit" as const,
      amount,
      reason: reason.slice(0, 500),
      createdAt: new Date(this.now()).toISOString(),
    });
    return next;
  }
  async grant(owner: string, amount: number, reason: string, adminKey?: string) {
    if (
      !process.env.WHILO_CREDITS_ADMIN_KEY?.trim() ||
      adminKey !== process.env.WHILO_CREDITS_ADMIN_KEY
    )
      throw new AppError(
        "Créditos só podem ser adicionados por uma chave administrativa do servidor",
        403,
      );
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000)
      throw new AppError("Crédito inválido", 422);
    const state = await this.get(owner);
    const next = {
      ...state,
      balance: state.balance + amount,
      totalGranted: state.totalGranted + amount,
      updatedAt: new Date(this.now()).toISOString(),
    };
    await this.db.put(owner, "o1-settings", next);
    await this.db.put(owner, "o1-credit-ledger", {
      id: randomUUID(),
      kind: "grant" as const,
      amount,
      reason: reason.slice(0, 500),
      createdAt: new Date(this.now()).toISOString(),
    });
    return next;
  }
  async history(owner: string) {
    return this.db.list<CreditEntry>(owner, "o1-credit-ledger");
  }
}
