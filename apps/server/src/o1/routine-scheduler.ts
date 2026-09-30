import type { AgentService } from "../engine/service.ts";
import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";
import type { O1Routine } from "./routines.ts";

export class O1RoutineScheduler {
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;
  constructor(
    private readonly db: Store,
    private readonly agent: AgentService,
    private readonly audit?: O1AuditLedger,
    private readonly now: () => number = Date.now,
  ) {}

  start(intervalMs = 30_000) {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick(); }, intervalMs);
    void this.tick();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const owners = await this.db.scan<O1Routine>("o1-routines");
      for (const record of owners) await this.runDue(record.owner, record.value);
    } finally {
      this.ticking = false;
    }
  }

  private async runDue(owner: string, routine: O1Routine) {
    if (!routine.enabled || routine.trigger.type !== "schedule" || !routine.nextRunAt) return;
    if (Date.parse(routine.nextRunAt) > this.now()) return;
    const taskId = `routine:${routine.id}:${routine.nextRunAt}`;
    const task = await this.agent.createTask(owner, {
      kind: "agent",
      title: routine.name,
      prompt: routine.goal,
      input: { routineId: routine.id, scheduledFor: routine.nextRunAt },
    }, taskId);
    await this.db.put(owner, "o1-routines", {
      ...routine,
      lastRunAt: new Date(this.now()).toISOString(),
      nextRunAt: undefined,
      updatedAt: new Date(this.now()).toISOString(),
    });
    await this.audit?.record({ owner, category: "system", action: "routine_scheduled_task_created", targetId: routine.id, data: { taskId: task.id } });
    return task;
  }
}