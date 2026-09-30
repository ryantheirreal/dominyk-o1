import type { AgentService } from "../engine/service.ts";
import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";
import { O1EventRouter, type O1Event } from "./event-router.ts";
import type { O1Routine } from "./routines.ts";

export class O1RoutineDispatcher {
  constructor(private readonly db: Store, private readonly agent: AgentService, private readonly audit?: O1AuditLedger) {}

  async dispatchEvent(owner: string, event: O1Event) {
    const router = new O1EventRouter(this.db, this.audit);
    const deliveries = await router.dispatch(owner, event);
    const created = [];
    for (const delivery of deliveries) {
      const routine = await this.db.get<O1Routine>(owner, "o1-routines", delivery.routineId);
      if (!routine || !routine.enabled) continue;
      const task = await this.agent.createTask(owner, {
        kind: "agent",
        title: routine.name,
        prompt: routine.goal + "\n\nTriggered by event: " + event.source + ":" + event.event,
        input: { routineId: routine.id, deliveryId: delivery.id, event: event.payload },
      });
      await router.consume(owner, delivery.id);
      await this.audit?.record({ owner, category: "system", action: "routine_task_created", targetId: routine.id, data: { taskId: task.id, deliveryId: delivery.id } });
      created.push(task);
    }
    return created;
  }
}