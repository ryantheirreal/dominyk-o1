export type PermissionMode = "ask_codex" | "ask_approval" | "approve_for_me";

export interface PermissionSettings {
  mode: PermissionMode;
  updatedAt: string;
  fullAccessConfirmedAt?: string;
}

export function defaultPermissionSettings(): PermissionSettings {
  return { mode: "ask_codex", updatedAt: new Date(0).toISOString() };
}

export function modeLabel(mode: PermissionMode) {
  if (mode === "ask_codex") return "Ask Codex anything";
  if (mode === "ask_approval") return "Ask for approval";
  return "Approve for me / Full access";
}

export function evaluatePermissionMode(
  mode: PermissionMode,
  risk: "read" | "write" | "sensitive" | "external" | "destructive",
  explicitApproval = false,
) {
  if (risk === "read") return { decision: "allow" as const, reason: "Read-only operation." };
  if (mode !== "ask_codex" && mode !== "ask_approval") return {
    decision: "allow" as const,
    reason: "Full access is active.",
  };
  if (explicitApproval) return {
    decision: "allow" as const,
    reason: "Human approval supplied.",
  };
  return {
    decision: "ask" as const,
    reason: mode === "ask_codex"
      ? "This mode never authorizes a write directly."
      : "This action requires human approval.",
  };
}
