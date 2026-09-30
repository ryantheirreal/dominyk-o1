import { test, expect } from "node:test";
import { chooseComputerStrategy } from "./computer-strategy.ts";

test("prefers deterministic DOM access for browser-only work", () => {
  expect(chooseComputerStrategy({ modelId: "any", task: "browse", browserOnly: true })).toBe("dom-first");
});

test("uses CUA for explicit desktop requirements", () => {
  expect(chooseComputerStrategy({ modelId: "any", task: "desktop", needsDesktop: true })).toBe("cua");
});

test("uses code execution as the default strategy for Astra-class models", () => {
  expect(chooseComputerStrategy({ modelId: "chatgpt-astra-6", task: "automation" })).toBe("code-execution");
});