export type O1PlanId = "mini" | "agent-pro-plus" | "max-20x";

export interface O1PlanModel {
  id: string;
  name: string;
}

export interface O1Plan {
  id: O1PlanId;
  name: string;
  models: readonly O1PlanModel[];
  totalEfforts: 3;
  unlockedEfforts: 1 | 2 | 3;
}

export const O1_PLANS = [
  {
    id: "mini",
    name: "Mini",
    models: [
      { id: "dominyk-aether-1", name: "Dominyk Aether 1" },
      { id: "dominyk-ace-1", name: "Dominyk Ace 1" },
      { id: "gpt-6-luna", name: "gpt 6 luna" },
    ],
    totalEfforts: 3,
    unlockedEfforts: 1,
  },
  {
    id: "agent-pro-plus",
    name: "Agent Pro+",
    models: [
      { id: "dominyk-o1", name: "Dominyk o1" },
      { id: "claude-sonnet-5.5", name: "Claude Sonnet 5.5" },
      { id: "claude-opus-5.5", name: "Claude Opus 5.5" },
      { id: "chatgpt-sol-6.1", name: "Chatgpt Sol 6.1" },
    ],
    totalEfforts: 3,
    unlockedEfforts: 2,
  },
  {
    id: "max-20x",
    name: "Max 20x",
    models: [
      { id: "dominyk-max-1", name: "Dominyk Max 1" },
      { id: "chatgpt-astra-6", name: "Chatgpt Astra 6" },
      { id: "claude-fable-5.1", name: "Claude Fable 5.1" },
    ],
    totalEfforts: 3,
    unlockedEfforts: 3,
  },
] as const satisfies readonly O1Plan[];

export type O1PlanModelId = (typeof O1_PLANS)[number]["models"][number]["id"];

export function getO1Plan(id: O1PlanId) {
  return O1_PLANS.find((plan) => plan.id === id) ?? O1_PLANS[0];
}