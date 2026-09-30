import { test, expect } from "node:test";
import { MissionGovernor, canTransition, type MissionCheckpoint } from "./mission-governor.ts";

const base: MissionCheckpoint = {
  missionId: "m1",
  status: "planned",
  phaseIndex: 0,
  completedSteps: 0,
  estimatedCost: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("allows only valid mission transitions", () => {
  expect(canTransition("planned", "queued")).toBe(true);
  expect(canTransition("succeeded", "running")).toBe(false);
});

test("records checkpoints without accepting invalid counters", () => {
  const governor = new MissionGovernor();
  const state = governor.checkpoint(base, { phaseIndex: 2, completedSteps: 3, estimatedCost: 0.4 });
  expect(state.phaseIndex).toBe(2);
  expect(state.completedSteps).toBe(3);
  expect(state.estimatedCost).toBe(0.4);
  expect(() => governor.checkpoint(base, { completedSteps: -1 })).toThrow(/non-negative/);
});

test("tracks budget exhaustion at the mission seam", () => {
  const governor = new MissionGovernor();
  const state = governor.checkpoint(base, { completedSteps: 4, estimatedCost: 0.4 });
  expect(governor.withinBudget(state, { maxSteps: 5, maxCost: 1 })).toBe(true);
  expect(governor.withinBudget(state, { maxSteps: 4 })).toBe(false);
  expect(governor.withinBudget(state, { maxCost: 0.4 })).toBe(false);
});

test("supports explicit recovery from uncertain outcomes", () => {
  const governor = new MissionGovernor();
  const recovering = governor.transition({ ...base, status: "unknown_outcome" }, "recovering");
  expect(recovering.status).toBe("recovering");
});