export type O1ComputerStrategy = "dom-first" | "cua" | "code-execution";

export interface O1ComputerStrategyInput {
  modelId: string;
  task: string;
  needsDesktop?: boolean;
  browserOnly?: boolean;
  needsStructuredDom?: boolean;
}

export function chooseComputerStrategy(input: O1ComputerStrategyInput): O1ComputerStrategy {
  if (input.browserOnly || input.needsStructuredDom) return "dom-first";
  if (input.needsDesktop) return "cua";
  return input.modelId.toLowerCase().includes("astra") ? "code-execution" : "cua";
}