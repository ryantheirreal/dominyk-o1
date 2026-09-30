export type O1Risk = "read" | "write" | "sensitive" | "external" | "destructive";
export type O1Decision = "allow" | "deny" | "ask";

export interface PolicyInput {
  actorId: string;
  tool: string;
  risk: O1Risk;
  target?: string;
  explicitApproval?: boolean;
  dryRun?: boolean;
}

export interface PolicyResult {
  decision: O1Decision;
  reason: string;
  auditClass: O1Risk;
}

const blockedTargets = new Set(["169.254.169.254", "metadata.google.internal"]);
const writeTools = /(?:send|delete|update|create|publish|deploy|purchase|checkout|transfer|message)/i;
const destructiveTools = /(?:delete|destroy|drop|terminate|wipe|reset-prod)/i;

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  if (!input.actorId) return { decision:"deny", reason:"Missing actor identity", auditClass:input.risk };
  if (input.target && blockedTargets.has(input.target)) return { decision:"deny", reason:"Target is blocked by O1 egress policy", auditClass:input.risk };
  if (input.dryRun) return { decision:"allow", reason:"Dry-run does not dispatch an external action", auditClass:"read" };
  if (input.risk === "destructive" || destructiveTools.test(input.tool)) {
    return input.explicitApproval
      ? { decision:"allow", reason:"Explicit approval supplied for destructive action", auditClass:"destructive" }
      : { decision:"ask", reason:"Destructive action requires explicit human approval", auditClass:"destructive" };
  }
  if (input.risk === "external" || input.risk === "sensitive" || writeTools.test(input.tool)) {
    return input.explicitApproval
      ? { decision:"allow", reason:"Explicit approval supplied for external write", auditClass:input.risk }
      : { decision:"ask", reason:"External or sensitive action requires human approval", auditClass:input.risk };
  }
  return { decision:"allow", reason:"Read-only action is permitted", auditClass:"read" };
}

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;
  const sensitive = /(?:token|secret|password|authorization|api[_-]?key|cookie|session)/i;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sensitive.test(key) ? "[REDACTED]" : redactSecrets(child)]));
}
