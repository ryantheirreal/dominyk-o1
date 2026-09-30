import { test, expect } from "node:test";
import { parseOpenAIComputerCall } from "./openai-computer-call.ts";

test("normalizes GA batched computer actions and detects approval-sensitive actions", () => {
  const call = parseOpenAIComputerCall({
    type: "computer_call",
    call_id: "call-1",
    actions: [
      { type: "screenshot" },
      { type: "click", x: 10, y: 20, button: "left" },
      { type: "type", text: "hello" },
    ],
    pending_safety_checks: [],
  });
  expect(call.callId).toBe("call-1");
  expect(call.actions).toHaveLength(3);
  expect(call.requiresApproval).toBe(true);
});

test("supports legacy single-action computer calls", () => {
  const call = parseOpenAIComputerCall({
    type: "computer_call",
    call_id: "legacy",
    action: { type: "double_click", x: 2, y: 4 },
  });
  expect(call.actions[0]).toEqual({ type: "double_click", x: 2, y: 4 });
});

test("rejects unsupported actions and unsafe coordinates", () => {
  expect(() => parseOpenAIComputerCall({ type: "computer_call", call_id: "x", actions: [{ type: "launch_shell" }] })).toThrow(/Unsupported computer action/);
  expect(() => parseOpenAIComputerCall({ type: "computer_call", call_id: "x", actions: [{ type: "click", x: -1, y: 2 }] })).toThrow(/coordinate/);
});