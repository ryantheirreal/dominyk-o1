import { test, expect } from "node:test";
import { routeModel } from "./model-router.ts";

test("routes a requested Mini model when the model and effort are entitled", () => {
  expect(routeModel({ planId: "mini", effort: 1, modelId: "dominyk-aether-1" })).toEqual({
    planId: "mini",
    modelId: "dominyk-aether-1",
    effort: 1,
    reason: "requested",
  });
});

test("rejects a locked Mini effort before routing", () => {
  expect(() => routeModel({ planId: "mini", effort: 2 })).toThrow(/not unlocked/);
});

test("rejects a model outside the active plan", () => {
  expect(() => routeModel({ planId: "agent-pro-plus", effort: 1, modelId: "dominyk-max-1" })).toThrow(/not included/);
});

test("falls back to the plan default without pretending a provider exists", () => {
  expect(routeModel({ planId: "max-20x", effort: 3 })).toEqual({
    planId: "max-20x",
    modelId: "dominyk-max-1",
    effort: 3,
    reason: "plan-default",
  });
});