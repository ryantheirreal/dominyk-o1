import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";

export interface O1BenchmarkResult {
  id: string;
  owner: string;
  suite: string;
  taskId: string;
  modelId?: string;
  success: boolean;
  verified: boolean;
  durationMs: number;
  cost?: number;
  interventions: number;
  recoveryCount: number;
  createdAt: string;
}

export class O1BenchmarkEngine {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async record(input: Omit<O1BenchmarkResult, "createdAt">) {
    const result: O1BenchmarkResult = { ...input, createdAt: new Date().toISOString() };
    await this.db.put(input.owner, "o1-benchmarks", result);
    await this.audit?.record({ owner: input.owner, category: "system", action: "benchmark_recorded", targetId: input.id, data: { suite: input.suite, taskId: input.taskId, success: input.success, verified: input.verified } });
    return result;
  }

  async summary(owner: string, suite?: string) {
    const rows = await this.db.list<O1BenchmarkResult>(owner, "o1-benchmarks");
    const filtered = suite ? rows.filter((row) => row.suite === suite) : rows;
    const count = filtered.length;
    const successes = filtered.filter((row) => row.success).length;
    const verified = filtered.filter((row) => row.verified).length;
    const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { suite: suite ?? null, runs: count, completionRate: count ? successes / count : 0, verificationRate: count ? verified / count : 0, averageDurationMs: avg(filtered.map((row) => row.durationMs)), averageCost: avg(filtered.filter((row) => row.cost !== undefined).map((row) => row.cost!)), averageInterventions: avg(filtered.map((row) => row.interventions)), averageRecoveries: avg(filtered.map((row) => row.recoveryCount)) };
  }
}