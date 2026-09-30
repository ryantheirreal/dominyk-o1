export type O1FailureClass = "timeout" | "provider_unavailable" | "auth" | "validation" | "conflict" | "rate_limit" | "unknown";

export interface O1RecoveryDecision {
  failure: O1FailureClass;
  strategy: "retry_same" | "retry_modified" | "alternative_tool" | "alternative_provider" | "refresh_state" | "restore_checkpoint" | "human_escalation" | "fail";
  automatic: boolean;
  reason: string;
}

export function classifyFailure(error: unknown): O1FailureClass {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/timeout|timed out|deadline/.test(message)) return "timeout";
  if (/unauthori[sz]ed|forbidden|permission|credential/.test(message)) return "auth";
  if (/429|rate.?limit|too many requests/.test(message)) return "rate_limit";
  if (/409|conflict|already executing|concurrent/.test(message)) return "conflict";
  if (/400|invalid|validation|malformed/.test(message)) return "validation";
  if (/502|503|504|unavailable|connection|network/.test(message)) return "provider_unavailable";
  return "unknown";
}

export function decideRecovery(failure: O1FailureClass): O1RecoveryDecision {
  switch (failure) {
    case "timeout": return { failure, strategy: "retry_modified", automatic: true, reason: "Increase observation/retry strategy without blindly repeating an external side effect." };
    case "rate_limit": return { failure, strategy: "retry_same", automatic: true, reason: "Honor provider backoff before retrying." };
    case "provider_unavailable": return { failure, strategy: "alternative_provider", automatic: true, reason: "Try a configured equivalent provider when available." };
    case "conflict": return { failure, strategy: "refresh_state", automatic: true, reason: "Reload durable state before making another change." };
    case "validation": return { failure, strategy: "retry_modified", automatic: false, reason: "The agent must correct the malformed input before retrying." };
    case "auth": return { failure, strategy: "human_escalation", automatic: false, reason: "Authentication or authorization requires a new grant or human action." };
    default: return { failure, strategy: "human_escalation", automatic: false, reason: "Unknown failure should not be retried blindly." };
  }
}