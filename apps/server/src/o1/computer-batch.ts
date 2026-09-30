import type { ComputerAction } from "./computer-gateway.ts";

export interface O1ComputerStepResult<T> {
  index: number;
  action: ComputerAction;
  observation?: T;
  status: "succeeded" | "failed";
  error?: string;
}

export async function executeComputerBatch<T>(
  actions: readonly ComputerAction[],
  execute: (action: ComputerAction) => Promise<T>,
) {
  if (!actions.length) throw new Error("Computer batch must contain at least one action");
  const results: O1ComputerStepResult<T>[] = [];
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index];
    try {
      const observation = await execute(action);
      results.push({ index, action, observation, status: "succeeded" });
    } catch (error) {
      results.push({ index, action, status: "failed", error: error instanceof Error ? error.message : String(error) });
      break;
    }
  }
  return {
    results,
    completed: results.every((result) => result.status === "succeeded"),
    stoppedAt: results.find((result) => result.status === "failed")?.index,
  };
}