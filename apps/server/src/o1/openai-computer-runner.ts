import { randomUUID } from "node:crypto";
import type { ComputerAction, ComputerGateway, ComputerObservation } from "./computer-gateway.ts";
import { executeComputerBatch } from "./computer-batch.ts";
import type { O1ComputerCall, O1ComputerCallAction } from "./openai-computer-call.ts";
import type { O1ResponsesComputerClient } from "./openai-computer-client.ts";
import { evaluatePermissionMode, normalizePermissionMode } from "./permissions.ts";

export type O1ComputerRunResult =
  | { status: "completed"; responseId: string; output: unknown[] }
  | { status: "waiting_approval"; responseId: string; call: O1ComputerCall }
  | { status: "exhausted"; responseId: string; output: unknown[] };

function toGatewayAction(action: O1ComputerCallAction): ComputerAction | undefined {
  switch (action.type) {
    case "screenshot": return undefined;
    case "click": return { type: "click", x: action.x, y: action.y, button: action.button };
    case "double_click": return { type: "double_click", x: action.x, y: action.y };
    case "scroll": return { type: "scroll", x: action.x, y: action.y, deltaX: action.scroll_x, deltaY: action.scroll_y };
    case "type": return { type: "type", text: action.text };
    case "wait": return { type: "wait" };
    case "move": return { type: "move", x: action.x, y: action.y };
    case "keypress": return { type: "keypress", keys: action.keys };
    case "drag": return { type: "drag", path: action.path };
  }
}

export class O1ComputerUseRunner {
  constructor(
    private readonly client: O1ResponsesComputerClient,
    private readonly gateway: ComputerGateway,
  ) {}

  async run(input: {
    prompt: string;
    permissionMode?: string;
    maxTurns?: number;
    computerId: string;
    runId?: string;
    approvalGranted?: boolean;
    checkpoint?: (state: { runId: string; responseId: string; turn: number; status: O1ComputerRunResult["status"]; call?: O1ComputerCall }) => Promise<void>;
  }): Promise<O1ComputerRunResult> {
    const maxTurns = Math.max(1, Math.min(input.maxTurns ?? 20, 100));
    const runId = input.runId ?? randomUUID();
    let response = await this.client.start(input.prompt);
    await input.checkpoint?.({ runId, responseId: response.responseId, turn: 0, status: "running", call: response.computerCall });
    for (let turn = 0; turn < maxTurns; turn += 1) {
      if (!response.computerCall) {
        await input.checkpoint?.({ runId, responseId: response.responseId, turn, status: "completed" });
        return { status: "completed", responseId: response.responseId, output: response.output };
      }
      const call = response.computerCall;
      const permission = evaluatePermissionMode(normalizePermissionMode(input.permissionMode), "write");
      if ((!input.approvalGranted && call.requiresApproval) || permission.decision !== "allow") {
        await input.checkpoint?.({ runId, responseId: response.responseId, turn, status: "waiting_approval", call });
        return { status: "waiting_approval", responseId: response.responseId, call };
      }
      let latest: ComputerObservation | undefined;
      const gatewayActions = call.actions.map(toGatewayAction).filter((action): action is ComputerAction => Boolean(action));
      if (gatewayActions.length) {
        const batch = await executeComputerBatch(gatewayActions, async (action) => {
          latest = await this.gateway.act(input.computerId, action);
          return latest;
        });
        if (!batch.completed)
          throw new Error(batch.results.find((item) => item.status === "failed")?.error ?? "Computer batch failed");
      }
      if (!latest || !latest.screenshotB64) latest = await this.gateway.observe(input.computerId);
      response = await this.client.continueWithScreenshot(response.responseId, call.callId, latest.screenshotB64);
      await input.checkpoint?.({ runId, responseId: response.responseId, turn: turn + 1, status: "running", call: response.computerCall });
    }
    await input.checkpoint?.({ runId, responseId: response.responseId, turn: maxTurns, status: "exhausted" });
    return { status: "exhausted", responseId: response.responseId, output: response.output };
  }
}