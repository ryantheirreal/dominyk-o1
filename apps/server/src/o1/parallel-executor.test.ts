import { test, expect } from "node:test";
import { executeParallelTasks } from "./parallel-executor.ts";

test("runs independent tasks concurrently within the concurrency bound", async () => {
  let active = 0; let peak = 0;
  const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
  const result = await executeParallelTasks([
    { id: "a", dependsOn: [], run: async () => { active++; peak = Math.max(peak, active); await pause(); active--; return "a"; } },
    { id: "b", dependsOn: [], run: async () => { active++; peak = Math.max(peak, active); await pause(); active--; return "b"; } },
    { id: "c", dependsOn: ["a","b"], run: async () => "c" },
  ], 2);
  expect(peak).toBe(2);
  expect(result.map((item) => item.status)).toEqual(["succeeded","succeeded","succeeded"]);
});

test("does not execute a task whose dependency failed", async () => {
  let ran = false;
  const result = await executeParallelTasks([
    { id: "a", dependsOn: [], run: async () => { throw new Error("boom"); } },
    { id: "b", dependsOn: ["a"], run: async () => { ran = true; } },
  ]);
  expect(ran).toBe(false);
  expect(result[1]?.status).toBe("failed");
});