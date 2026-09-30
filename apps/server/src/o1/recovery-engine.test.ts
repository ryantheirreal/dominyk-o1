import { test, expect } from "node:test";
import { classifyFailure, decideRecovery } from "./recovery-engine.ts";

test("classifies provider timeout as recoverable timeout", () => {
  expect(classifyFailure(new Error("request timed out"))).toBe("timeout");
  expect(decideRecovery("timeout").strategy).toBe("retry_modified");
});

test("routes authentication failures to human escalation", () => {
  expect(classifyFailure(new Error("401 unauthorized"))).toBe("auth");
  expect(decideRecovery("auth").automatic).toBe(false);
});

test("never blindly retries unknown failure", () => {
  const decision = decideRecovery("unknown");
  expect(decision.automatic).toBe(false);
  expect(decision.strategy).toBe("human_escalation");
});