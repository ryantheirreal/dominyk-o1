import { createHash } from "node:crypto";
import type { Store } from "../db.ts";
import type { O1AuditLedger } from "./audit-ledger.ts";
import type { O1Routine } from "./routines.ts";

export interface O1Event {
  source: string;
  event: string;
  payload: Record<string, unknown>;
  at: string;
}

export interface O1RoutineDelivery {
  id: string;
  owner: string;
  routineId: string;
  event: O1Event;
  status: "queued" | "consumed";
  createdAt: string;
}

export class O1EventRouter {
  constructor(private readonly db: Store, private readonly audit?: O1AuditLedger) {}

  async dispatch(owner: string, event: O1Event) {
    const routines = await this.db.list<O1Routine>(owner, "o1-routines");
    const matches = routines.filter((routine) => routine.enabled && routine.trigger.type === "event" && routine.trigger.source === event.source && routine.trigger.event === event.event);
    const deliveries: O1RoutineDelivery[] = [];
    for (const routine of matches) {
      const id = createHash("sha256").update(owner + ":" + routine.id + ":" + event.source + ":" + event.event + ":" + event.at).digest("hex");
      const existing = await this.db.get<O1RoutineDelivery>(owner, "o1-routine-events", id);
      if (existing) continue;
      const delivery: O1RoutineDelivery = { id, owner, routineId: routine.id, event, status: "queued", createdAt: new Date().toISOString() };
      await this.db.put(owner, "o1-routine-events", delivery);
      await this.audit?.record({ owner, category: "system", action: "routine_event_queued", targetId: routine.id, data: { source: event.source, event: event.event, deliveryId: id } });
      deliveries.push(delivery);
    }
    return deliveries;
  }

  async consume(owner: string, id: string) {
    const delivery = await this.db.get<O1RoutineDelivery>(owner, "o1-routine-events", id);
    if (!delivery) throw new Error("Routine delivery not found");
    if (delivery.status === "consumed") return delivery;
    const consumed = { ...delivery, status: "consumed" as const };
    await this.db.put(owner, "o1-routine-events", consumed);
    await this.audit?.record({ owner, category: "system", action: "routine_event_consumed", targetId: delivery.routineId, data: { deliveryId: id } });
    return consumed;
  }
}