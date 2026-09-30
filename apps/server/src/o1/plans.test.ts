import { test, expect } from "node:test";
import { O1_PLANS } from "../../../../packages/domain/src/plans.ts";

test("O1 plans expose the requested model and effort entitlements", () => {
  const mini = O1_PLANS.find((plan) => plan.id === "mini");
  const pro = O1_PLANS.find((plan) => plan.id === "agent-pro-plus");
  const max = O1_PLANS.find((plan) => plan.id === "max-20x");
  expect(mini?.models.map((model) => model.name)).toEqual(["Dominyk Aether 1", "Dominyk Ace 1", "gpt 6 luna"]);
  expect(mini?.unlockedEfforts).toBe(1);
  expect(pro?.models.map((model) => model.name)).toEqual(["Dominyk o1", "Claude Sonnet 5.5", "Claude Opus 5.5", "Chatgpt Sol 6.1"]);
  expect(pro?.unlockedEfforts).toBe(2);
  expect(max?.models.map((model) => model.name)).toEqual(["Dominyk Max 1", "Chatgpt Astra 6", "Claude Fable 5.1"]);
  expect(max?.unlockedEfforts).toBe(3);
});