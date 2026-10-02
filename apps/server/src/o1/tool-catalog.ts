export type O1ToolRisk = "read" | "write" | "sensitive" | "external" | "destructive";

export interface O1ToolDefinition {
  id: string;
  name: string;
  description: string;
  capability: string;
  risk: O1ToolRisk;
  keywords: string[];
  enabled: boolean;
}

export const O1_TOOL_CATALOG: readonly O1ToolDefinition[] = [
  { id: "browse_web", name: "Browse web", description: "Observe a public web page through the browser runtime.", capability: "browser-runtime", risk: "read", keywords: ["web", "browser", "research"], enabled: true },
  { id: "browser_input", name: "Browser input", description: "Interact with an active browser session.", capability: "computer-control", risk: "write", keywords: ["click", "type", "form", "browser"], enabled: true },
  { id: "run_computer_command", name: "Computer shell", description: "Execute a bounded command inside the agent computer.", capability: "shell-sandbox", risk: "write", keywords: ["shell", "terminal", "code", "build"], enabled: true },
  { id: "connector_read", name: "Connector read", description: "Read bounded data from a configured connector.", capability: "connector-bus", risk: "read", keywords: ["github", "slack", "notion", "telegram", "discord"], enabled: true },
  { id: "connector_propose", name: "Connector write proposal", description: "Prepare an external connector write for review.", capability: "approval-kernel", risk: "external", keywords: ["send", "message", "external", "connector"], enabled: true },
  { id: "payments", name: "Pagamentos", description: "Prepare a Stripe checkout link; execution always requires explicit approval.", capability: "payments", risk: "external", keywords: ["payment", "payments", "pagamento", "pagar", "stripe", "checkout"], enabled: true },
  { id: "travel_planning", name: "Viagens", description: "Compare travel search options and prepare an itinerary without booking automatically.", capability: "travel", risk: "read", keywords: ["travel", "trip", "viagem", "voo", "hotel", "reservar"], enabled: true },
  { id: "delegate_task", name: "Delegate task", description: "Create durable background work.", capability: "long-horizon-runtime", risk: "write", keywords: ["background", "long-running", "task"], enabled: true },
] as const;

export function discoverTools(query: string, options: { capability?: string; risk?: O1ToolRisk; limit?: number } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const limit = Math.max(1, Math.min(options.limit ?? 8, 32));
  return O1_TOOL_CATALOG
    .filter((tool) => tool.enabled)
    .filter((tool) => !options.capability || tool.capability === options.capability)
    .filter((tool) => !options.risk || tool.risk === options.risk)
    .map((tool) => ({ tool, score: terms.reduce((score, term) => score + (tool.keywords.some((keyword) => keyword.includes(term) || term.includes(keyword)) ? 2 : 0) + (tool.description.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .filter((item) => terms.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.id.localeCompare(b.tool.id))
    .slice(0, limit)
    .map((item) => item.tool);
}
