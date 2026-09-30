export type O1ComputerCallAction =
  | { type: "screenshot" }
  | { type: "click"; x: number; y: number; button?: "left" | "right" | "wheel" | "back" | "forward" }
  | { type: "double_click"; x: number; y: number }
  | { type: "scroll"; x: number; y: number; scroll_x: number; scroll_y: number }
  | { type: "type"; text: string }
  | { type: "wait" }
  | { type: "move"; x: number; y: number }
  | { type: "keypress"; keys: string[] }
  | { type: "drag"; path: Array<{ x: number; y: number }> };

export interface O1ComputerCall {
  callId: string;
  actions: O1ComputerCallAction[];
  requiresApproval: boolean;
  safetyChecks?: string[];
}

export function parseOpenAIComputerCall(input: unknown): O1ComputerCall {
  if (!input || typeof input !== "object") throw new Error("Invalid computer call");
  const value = input as Record<string, unknown>;
  if (value.type !== "computer_call") throw new Error("Expected computer_call");
  if (typeof value.call_id !== "string" || !value.call_id.trim()) throw new Error("Computer call_id is required");
  const rawActions = Array.isArray(value.actions) ? value.actions : value.action ? [value.action] : [];
  if (!rawActions.length) throw new Error("Computer call contains no actions");
  const actions = rawActions.map(parseAction);
  const safetyChecks = Array.isArray(value.pending_safety_checks)
    ? value.pending_safety_checks.filter((item): item is string => typeof item === "string")
    : [];
  return {
    callId: value.call_id,
    actions,
    requiresApproval: actions.some(isHighImpact) || safetyChecks.length > 0,
    ...(safetyChecks.length ? { safetyChecks } : {}),
  };
}

function parseAction(input: unknown): O1ComputerCallAction {
  if (!input || typeof input !== "object") throw new Error("Invalid computer action");
  const value = input as Record<string, unknown>;
  if (typeof value.type !== "string") throw new Error("Computer action type is required");
  switch (value.type) {
    case "screenshot": case "wait": return { type: value.type };
    case "type": if (typeof value.text !== "string" || value.text.length > 20000) throw new Error("Invalid computer type action"); return { type: "type", text: value.text };
    case "keypress": if (!Array.isArray(value.keys) || value.keys.some((key) => typeof key !== "string" || key.length > 64)) throw new Error("Invalid computer keypress action"); return { type: "keypress", keys: value.keys };
    case "click": return { type: "click", x: coordinate(value.x), y: coordinate(value.y), ...(value.button ? { button: enumValue(value.button, ["left","right","wheel","back","forward"] as const) } : {}) };
    case "double_click": return { type: "double_click", x: coordinate(value.x), y: coordinate(value.y) };
    case "move": return { type: "move", x: coordinate(value.x), y: coordinate(value.y) };
    case "scroll": return { type: "scroll", x: coordinate(value.x), y: coordinate(value.y), scroll_x: finite(value.scroll_x), scroll_y: finite(value.scroll_y) };
    case "drag": if (!Array.isArray(value.path) || value.path.length < 2 || value.path.length > 100) throw new Error("Invalid drag path"); return { type: "drag", path: value.path.map((point) => { if (!point || typeof point !== "object") throw new Error("Invalid drag point"); const p = point as Record<string, unknown>; return { x: coordinate(p.x), y: coordinate(p.y) }; }) };
    default: throw new Error(`Unsupported computer action: ${value.type}`);
  }
}

function finite(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Computer coordinate must be finite");
  return value;
}

function coordinate(value: unknown) {
  const number = finite(value);
  if (number < 0 || number > 10000) throw new Error("Computer coordinate is outside the supported range");
  return number;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error("Unsupported computer button");
  return value as T;
}

function isHighImpact(action: O1ComputerCallAction) {
  return action.type === "type" || action.type === "keypress" || action.type === "click" || action.type === "double_click" || action.type === "drag";
}