import { ImessageConnector } from "./connectors/imessage.ts";

export type ConnectorKind = "native" | "rest" | "bridge";

export interface ConnectorManifest {
  id: string;
  name: string;
  kind: ConnectorKind;
  category: "productivity" | "code" | "messaging" | "crm" | "storage" | "commerce" | "research" | "automation";
  env: string[];
  capabilities: string[];
  healthPath?: string;
}

export interface ConnectorStatus extends ConnectorManifest {
  configured: boolean;
  status: "ready" | "unconfigured" | "unreachable" | "error";
  detail?: string;
}

export const CONNECTORS: readonly ConnectorManifest[] = [
  { id:"google", name:"Google Workspace", kind:"native", category:"productivity", env:["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"], capabilities:["gmail","calendar","drive"] },
  { id:"github", name:"GitHub", kind:"rest", category:"code", env:["GITHUB_TOKEN"], capabilities:["repos","issues","pulls","actions","releases"], healthPath:"/user" },
  { id:"gitlab", name:"GitLab", kind:"rest", category:"code", env:["GITLAB_TOKEN"], capabilities:["repos","issues","merge_requests","pipelines"], healthPath:"/api/v4/user" },
  { id:"linear", name:"Linear", kind:"rest", category:"code", env:["LINEAR_API_KEY"], capabilities:["issues","projects","teams"] },
  { id:"slack", name:"Slack", kind:"rest", category:"messaging", env:["SLACK_BOT_TOKEN"], capabilities:["messages","threads","channels","search"], healthPath:"/api/auth.test" },
  { id:"discord", name:"Discord", kind:"rest", category:"messaging", env:["DISCORD_BOT_TOKEN"], capabilities:["messages","channels","guilds"], healthPath:"/users/@me" },
  { id:"telegram", name:"Telegram", kind:"rest", category:"messaging", env:["TELEGRAM_BOT_TOKEN"], capabilities:["messages","updates","files"] },
  { id:"whatsapp", name:"WhatsApp Cloud", kind:"rest", category:"messaging", env:["WHATSAPP_TOKEN","WHATSAPP_PHONE_NUMBER_ID"], capabilities:["messages","media","templates"] },
  { id:"imessage", name:"iMessage Bridge", kind:"bridge", category:"messaging", env:["IMESSAGE_BRIDGE_URL","IMESSAGE_BRIDGE_TOKEN"], capabilities:["read_messages","send_messages","image_attachments","group_chats"], healthPath:"/info" },
  { id:"microsoft365", name:"Microsoft 365", kind:"native", category:"productivity", env:["MICROSOFT_OAUTH_CLIENT_ID","MICROSOFT_OAUTH_CLIENT_SECRET"], capabilities:["outlook","calendar","onedrive","teams"] },
  { id:"notion", name:"Notion", kind:"rest", category:"productivity", env:["NOTION_API_KEY"], capabilities:["pages","databases","search"], healthPath:"/v1/users/me" },
  { id:"dropbox", name:"Dropbox", kind:"rest", category:"storage", env:["DROPBOX_TOKEN"], capabilities:["files","search","sharing"], healthPath:"/2/users/get_current_account" },
  { id:"hubspot", name:"HubSpot", kind:"rest", category:"crm", env:["HUBSPOT_TOKEN"], capabilities:["contacts","companies","deals","tickets"], healthPath:"/crm/v3/objects/contacts" },
  { id:"salesforce", name:"Salesforce", kind:"rest", category:"crm", env:["SALESFORCE_ACCESS_TOKEN","SALESFORCE_INSTANCE_URL"], capabilities:["contacts","accounts","opportunities","cases"] },
  { id:"jira", name:"Jira", kind:"rest", category:"code", env:["JIRA_BASE_URL","JIRA_API_TOKEN"], capabilities:["issues","projects","comments","worklogs"] },
  { id:"asana", name:"Asana", kind:"rest", category:"productivity", env:["ASANA_TOKEN"], capabilities:["tasks","projects","teams"], healthPath:"/api/1.0/users/me" },
  { id:"trello", name:"Trello", kind:"rest", category:"productivity", env:["TRELLO_API_KEY","TRELLO_TOKEN"], capabilities:["boards","cards","lists"] },
  { id:"airtable", name:"Airtable", kind:"rest", category:"productivity", env:["AIRTABLE_TOKEN"], capabilities:["bases","records","views"] },
  { id:"twilio", name:"Twilio", kind:"rest", category:"messaging", env:["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN"], capabilities:["sms","whatsapp","voice"] },
  { id:"stripe", name:"Stripe Connect", kind:"native", category:"commerce", env:["STRIPE_SECRET_KEY"], capabilities:["customers","subscriptions","entitlements","webhooks"] },
  { id:"n8n", name:"n8n", kind:"rest", category:"automation", env:["N8N_BASE_URL","N8N_API_KEY"], capabilities:["workflows","executions","webhooks"] },
  { id:"composio", name:"Composio", kind:"rest", category:"automation", env:["COMPOSIO_API_KEY"], capabilities:["managed_tools","oauth","mcp"] },
  { id:"browserbase", name:"Browserbase", kind:"rest", category:"research", env:["BROWSERBASE_API_KEY"], capabilities:["sessions","proxies","browser"] },
  { id:"sentry", name:"Sentry", kind:"rest", category:"research", env:["SENTRY_AUTH_TOKEN"], capabilities:["issues","events","releases"] },
  { id:"supabase", name:"Supabase", kind:"rest", category:"storage", env:["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"], capabilities:["database","storage","auth","edge_functions"] },
] as const;

function isConfigured(manifest: ConnectorManifest) {
  return manifest.env.every((key) => Boolean(process.env[key]?.trim()));
}

function restBase(id: string) {
  const mapping: Record<string, string | undefined> = {
    github: process.env.GITHUB_BASE_URL ?? "https://api.github.com",
    gitlab: process.env.GITLAB_URL ?? "https://gitlab.com",
    slack: "https://slack.com",
    discord: "https://discord.com/api",
    telegram: process.env.TELEGRAM_BASE_URL ?? "https://api.telegram.org",
    whatsapp: "https://graph.facebook.com",
    notion: "https://api.notion.com",
    dropbox: "https://api.dropboxapi.com",
    hubspot: "https://api.hubapi.com",
    jira: process.env.JIRA_BASE_URL,
    asana: "https://app.asana.com",
    sentry: "https://sentry.io/api/0",
    supabase: process.env.SUPABASE_URL,
  };
  return mapping[id];
}

function authHeaders(id: string): Record<string, string> {
  switch (id) {
    case "github": return { Authorization:"Bearer " + (process.env.GITHUB_TOKEN ?? ""), Accept:"application/vnd.github+json" };
    case "gitlab": return { Authorization:"Bearer " + (process.env.GITLAB_TOKEN ?? "") };
    case "slack": return { Authorization:"Bearer " + (process.env.SLACK_BOT_TOKEN ?? "") };
    case "discord": return { Authorization:"Bot " + (process.env.DISCORD_BOT_TOKEN ?? "") };
    case "whatsapp": return { Authorization:"Bearer " + (process.env.WHATSAPP_TOKEN ?? "") };
    case "notion": return { Authorization:"Bearer " + (process.env.NOTION_API_KEY ?? ""), "Notion-Version":"2025-09-03" };
    case "dropbox": return { Authorization:"Bearer " + (process.env.DROPBOX_TOKEN ?? ""), "Content-Type":"application/json" };
    case "hubspot": return { Authorization:"Bearer " + (process.env.HUBSPOT_TOKEN ?? "") };
    case "jira": return { Authorization:"Bearer " + (process.env.JIRA_API_TOKEN ?? "") };
    case "asana": return { Authorization:"Bearer " + (process.env.ASANA_TOKEN ?? "") };
    case "n8n": return { "X-N8N-API-KEY": process.env.N8N_API_KEY ?? "" };
    case "browserbase": return { "X-BB-API-Key": process.env.BROWSERBASE_API_KEY ?? "" };
    case "sentry": return { Authorization:"Bearer " + (process.env.SENTRY_AUTH_TOKEN ?? "") };
    case "supabase": return { apikey:process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", Authorization:"Bearer " + (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") };
    default: return {};
  }
}

async function safeHealth(manifest: ConnectorManifest): Promise<ConnectorStatus> {
  const configured = isConfigured(manifest);
  if (!configured) return { ...manifest, configured:false, status:"unconfigured" };
  if (["google","microsoft365","stripe","linear"].includes(manifest.id)) {
    return { ...manifest, configured:true, status:"ready", detail:"Native connector boundary configured; service health is checked by its integration layer." };
  }
  if (manifest.id === "imessage") {
    const result = await new ImessageConnector().health();
    return { ...manifest, configured:true, status:result.ok ? "ready" : "unreachable", detail:result.detail };
  }
  const base = restBase(manifest.id);
  if (!base || !manifest.healthPath) return { ...manifest, configured:true, status:"ready", detail:"Credentials configured; no generic health probe declared." };
  try {
    const response = await fetch(new URL(manifest.healthPath, base), { headers:authHeaders(manifest.id), signal:AbortSignal.timeout(6000) });
    return { ...manifest, configured:true, status:response.ok ? "ready" : "error", detail:"HTTP " + response.status };
  } catch (error) {
    return { ...manifest, configured:true, status:"unreachable", detail:error instanceof Error ? error.message : "Health check failed" };
  }
}

export async function connectorStatuses() {
  return Promise.all(CONNECTORS.map(safeHealth));
}

export function connector(manifestId: string) {
  return CONNECTORS.find((item) => item.id === manifestId);
}

export { isConfigured, restBase, authHeaders };
