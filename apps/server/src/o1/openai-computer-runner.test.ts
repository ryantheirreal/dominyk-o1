import { test, expect } from "node:test";
import { O1ComputerUseRunner } from "./openai-computer-runner.ts";

test("stops before executing a sensitive computer call when approval is required", async () => {
  let acted = false;
  const client = {
    async start() { return { responseId: "r1", computerCall: { callId: "c1", actions: [{ type: "click", x: 10, y: 20 }], requiresApproval: true, output: [] } }; },
    async continueWithScreenshot() { throw new Error("must not continue"); },
  };
  const gateway = {
    async observe() { return { computerId: "pc", screenshotB64: "AQ==", at: new Date().toISOString() }; },
    async act() { acted = true; return { computerId: "pc", screenshotB64: "AQ==", at: new Date().toISOString() }; },
  };
  const result = await new O1ComputerUseRunner(client, gateway).run({ prompt: "do it", computerId: "pc", permissionMode: "approve_for_me" });
  expect(result.status).toBe("waiting_approval");
  expect(acted).toBe(false);
});

test("executes a safe batch, sends the final screenshot, and continues the same response", async () => {
  const calls: string[] = [];
  let turn = 0;
  const client = {
    async start() { return { responseId: "r1", computerCall: { callId: "c1", actions: [{ type: "click", x: 10, y: 20 }, { type: "wait" }], requiresApproval: false, output: [] } }; },
    async continueWithScreenshot(responseId: string, callId: string, screenshot: string) { calls.push(responseId + ":" + callId + ":" + screenshot); turn += 1; return { responseId: "r2", output: [{ type: "message", text: "done" }] }; },
  };
  const gateway = {
    async observe() { return { computerId: "pc", screenshotB64: "AQID", at: new Date().toISOString() }; },
    async act(_id: string, action: any) { return { computerId: "pc", text: action.type, screenshotB64: "AQID", at: new Date().toISOString() }; },
  };
  const result = await new O1ComputerUseRunner(client, gateway).run({ prompt: "do it", computerId: "pc", permissionMode: "approve_for_me", maxTurns: 3 });
  expect(result.status).toBe("completed");
  expect(calls[0]).toBe("r1:c1:AQID");
});