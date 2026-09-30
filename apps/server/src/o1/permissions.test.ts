import { test, expect } from "node:test";
import { evaluatePermissionMode } from "./permissions.ts";

test("ask codex is read-only", () => {
  expect(evaluatePermissionMode("ask_codex","read").decision).toBe("allow");
  expect(evaluatePermissionMode("ask_codex","write").decision).toBe("ask");
});

test("ask for approval allows explicit human approval", () => {
  expect(evaluatePermissionMode("ask_approval","external",true).decision).toBe("allow");
});

test("full access authorizes writes", () => {
  expect(evaluatePermissionMode("approve_for_me","destructive").decision).toBe("allow");
});
