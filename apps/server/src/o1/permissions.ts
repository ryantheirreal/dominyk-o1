export type PermissionMode = "ask_o1" | "ask_approval" | "approve_for_me";

export interface PermissionSettings {
  mode: PermissionMode;
  updatedAt: string;
  fullAccessConfirmedAt?: string;
}

export function defaultPermissionSettings(): PermissionSettings {
  return { mode: "ask_o1", updatedAt: new Date(0).toISOString() };
}

export function normalizePermissionMode(mode?: string): PermissionMode {
  if (mode === "ask_approval" || mode === "approve_for_me") return mode;
  return "ask_o1";
}

export function modeLabel(mode: PermissionMode) {
  if (mode === "ask_o1") return "Ask o1 anything";
  if (mode === "ask_approval") return "Ask for approval";
  return "Approve for me / Full access";
}

export function evaluatePermissionMode(
  mode: string,
  risk: "read" | "write" | "sensitive" | "external" | "destructive",
  explicitApproval = false,
) {
  mode = normalizePermissionMode(mode);
  if (risk === "read") return { decision: "allow" as const, reason: "Read-only operation." };
  if (mode !== "ask_o1" && mode !== "ask_approval")
    return {
      decision: "allow" as const,
      reason: "Full access is active.",
    };
  if (explicitApproval) return {
    decision: "allow" as const,
    reason: "Human approval supplied.",
  };
  return {
    decision: "ask" as const,
    reason:
      mode === "ask_o1"
        ? "This mode never authorizes a write directly."
        : "This action requires human approval.",
  };
}
