import { test, expect } from "node:test";
import { capabilitySummary, expandCapability } from "./o1/capabilities.ts";
import { evaluatePolicy } from "./o1/policy.ts";
import { buildMission, modelRoute } from "./o1/runtime.ts";

test("O1 exposes exactly 35 S+ capabilities", () => {
  expect(capabilitySummary().total).toBe(35);
  expect(capabilitySummary().tier).toBe("S+");
});

test("low quality expands a capability into its specialist subsystems", () => {
  expect(expandCapability("mission-governor", 0.5)).toContain("planner");
});

test("policy is fail-closed for destructive actions", () => {
  expect(evaluatePolicy({ actorId:"u", tool:"delete_repository", risk:"destructive" }).decision).toBe("ask");
  expect(evaluatePolicy({ actorId:"u", tool:"delete_repository", risk:"destructive", explicitApproval:true }).decision).toBe("allow");
});

test("mission builder creates sequential checkpoints", () => {
  const result = buildMission({ id:"m1", goal:"ship", capabilities:["mission-governor","code-review"], qualityScore:0.5 });
  expect(result.plan.phases.some((phase) => phase.mode === "verification" && phase.capability === "mission-governor")).toBe(true);
  expect(result.plan.phases.length).toBeGreaterThan(2);
  expect(result.events[0].type).toBe("mission.created");
});

test("model router respects speed and complexity", () => {
  expect(modelRoute({ complexity:0.1, latencySensitive:true })).toBe("fast");
  expect(modelRoute({ complexity:0.9 })).toBe("max");
});

test("low-quality execution creates parallel specialist agents", async () => {
  const { buildExecutionStages } = await import("./o1/runtime.ts");
  const stages = buildExecutionStages(["multi-agent-swarm"], 0.5);
  expect(stages[0]?.parallel).toBe(true);
  expect(stages[0]?.specialists.length).toBeGreaterThan(1);
});

test("verification gates cover high-risk execution primitives", async () => {
  const { requiresVerification } = await import("./o1/runtime.ts");
  expect(requiresVerification("patch-engine")).toBe(true);
  expect(requiresVerification("files-rag")).toBe(false);
});
