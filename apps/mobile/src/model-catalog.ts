export const DOMINYK_MODELS = [
  { id: "dominyk-o1", name: "Dominyk o1" },
  { id: "dominyk-max-1", name: "Dominyk Max 1" },
  { id: "dominyk-aether-1", name: "Dominyk Aether 1" },
  { id: "dominyk-ace-1", name: "Dominyk Ace 1" },
] as const;

export type DominykModelId = (typeof DOMINYK_MODELS)[number]["id"];
