import { test, expect } from "node:test";
import { executeComputerBatch } from "./computer-batch.ts";

test("executes independent computer actions in order and returns observations", async () => {
  const seen: string[] = [];
  const result = await executeComputerBatch([{ type: "click", x: 1, y: 2 }, { type: "key", key: "ENTER" }], async (action) => {
    seen.push(action.type);
    return { ok: true };
  });
  expect(seen).toEqual(["click", "key"]);
  expect(result.completed).toBe(true);
  expect(result.results).toHaveLength(2);
});

test("stops at the first failed computer action", async () => {
  const result = await executeComputerBatch([{ type: "click", x: 1, y: 2 }, { type: "key", key: "ENTER" }, { type: "wait" }], async (action) => {
    if (action.type === "key") throw new Error("blocked");
    return { ok: true };
  });
  expect(result.completed).toBe(false);
  expect(result.stoppedAt).toBe(1);
  expect(result.results).toHaveLength(2);
});