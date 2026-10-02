import { evaluatePolicy, type O1Risk } from "./policy.ts";
import { ImessageConnector } from "./connectors/imessage.ts";

export type ConnectorOperation =
  | "github.get_user"
  | "github.search_repositories"
  | "slack.auth_test"
  | "slack.send_message"
  | "telegram.get_me"
  | "telegram.send_message"
  | "discord.me"
  | "discord.send_message"
  | "notion.search"
  | "stripe.create_checkout_link"
  | "travel.build_search"
  | "imessage.list_messages" | "imessage.get_attachment"
  | "imessage.send";

const READ_OPS = new Set<ConnectorOperation>([
  "github.get_user",
  "github.search_repositories",
  "slack.auth_test",
  "telegram.get_me",
  "discord.me",
  "notion.search",
  "travel.build_search",
  "imessage.list_messages",
  "imessage.get_attachment",
]);

const allowedHosts: Record<string, string> = {
  github: process.env.GITHUB_BASE_URL ?? "https://api.github.com",
  slack: "https://slack.com",
  telegram: process.env.TELEGRAM_BASE_URL ?? "https://api.telegram.org",
  discord: "https://discord.com/api",
  notion: "https://api.notion.com",
};

function headers(id: string): Record<string, string> {
  switch (id) {
    case "github": return { Authorization:"Bearer " + (process.env.GITHUB_TOKEN ?? ""), Accept:"application/vnd.github+json" };
    case "slack": return { Authorization:"Bearer " + (process.env.SLACK_BOT_TOKEN ?? "") };
    case "discord": return { Authorization:"Bot " + (process.env.DISCORD_BOT_TOKEN ?? "") };
    case "notion": return { Authorization:"Bearer " + (process.env.NOTION_API_KEY ?? "") };
    default: return {};
  }
}

function requiredEnv(id: string) {
  const envs: Record<string,string[]> = {
    github:["GITHUB_TOKEN"],
    slack:["SLACK_BOT_TOKEN"],
    telegram:["TELEGRAM_BOT_TOKEN"],
    discord:["DISCORD_BOT_TOKEN"],
    notion:["NOTION_API_KEY"],
    imessage:["IMESSAGE_BRIDGE_URL","IMESSAGE_BRIDGE_TOKEN"],
  };
  const missing=(envs[id] ?? []).filter((key)=>!process.env[key]?.trim());
  if (missing.length) throw new Error(id + " connector is not configured: " + missing.join(", "));
}

async function requestJson(url: string | URL, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(15000) });
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 1000) }; }
  if (!response.ok) throw new Error(`Connector HTTP ${response.status}: ${JSON.stringify(body).slice(0, 1000)}`);
  if (body && typeof body === "object" && "ok" in body && (body as { ok?: unknown }).ok === false)
    throw new Error(`Connector rejected the operation: ${JSON.stringify(body).slice(0, 1000)}`);
  return body;
}

export function operationRisk(operation: ConnectorOperation): O1Risk {
  return READ_OPS.has(operation) ? "read" : "external";
}

export class ConnectorBus {
  async execute(input: {
    actorId: string;
    operation: ConnectorOperation;
    payload?: Record<string, unknown>;
    approved?: boolean;
  }) {
    const policy=evaluatePolicy({
      actorId:input.actorId,
      tool:input.operation,
      risk:operationRisk(input.operation),
      target:input.operation.split(".")[0],
      explicitApproval:Boolean(input.approved),
    });
    if (policy.decision !== "allow") {
      const error=new Error(policy.reason);
      Object.assign(error,{code:"approval_required",decision:policy.decision});
      throw error;
    }
    const p=input.payload ?? {};
    switch(input.operation) {
      case "github.get_user":
        requiredEnv("github");
        return requestJson(new URL("/user",allowedHosts.github),{headers:headers("github")});
      case "github.search_repositories": {
        requiredEnv("github");
        const q=String(p.query ?? "").trim();
        if(!q) throw new Error("query is required");
        const url=new URL("/search/repositories",allowedHosts.github);
        url.searchParams.set("q",q);
        url.searchParams.set("per_page","10");
        return requestJson(url,{headers:headers("github")});
      }
      case "slack.auth_test":
        requiredEnv("slack");
        return requestJson(new URL("/api/auth.test",allowedHosts.slack),{headers:headers("slack")});
      case "slack.send_message":
        requiredEnv("slack");
        return requestJson(new URL("/api/chat.postMessage",allowedHosts.slack),{
          method:"POST",
          headers:{"Content-Type":"application/json",...headers("slack")},
          body:JSON.stringify({channel:String(p.channel ?? ""),text:String(p.text ?? "")}),
        });
      case "telegram.get_me":
        requiredEnv("telegram");
        return requestJson(allowedHosts.telegram + "/bot" + process.env.TELEGRAM_BOT_TOKEN + "/getMe");
      case "telegram.send_message":
        requiredEnv("telegram");
        return requestJson(allowedHosts.telegram + "/bot" + process.env.TELEGRAM_BOT_TOKEN + "/sendMessage",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({chat_id:String(p.chatId ?? ""),text:String(p.text ?? "")}),
        });
      case "discord.me":
        requiredEnv("discord");
        return requestJson(new URL("/users/@me",allowedHosts.discord),{headers:headers("discord")});
      case "discord.send_message":
        requiredEnv("discord");
        return requestJson(new URL("/channels/" + encodeURIComponent(String(p.channelId ?? "")) + "/messages",allowedHosts.discord),{
          method:"POST",headers:{"Content-Type":"application/json",...headers("discord")},
          body:JSON.stringify({content:String(p.text ?? "")}),
        });
      case "notion.search":
        requiredEnv("notion");
        return requestJson(new URL("/v1/search",allowedHosts.notion),{
          method:"POST",headers:{"Content-Type":"application/json",...headers("notion")},
          body:JSON.stringify({query:String(p.query ?? "")}),
        });
      case "travel.build_search": {
        const { buildTravelSearch } = await import("./travel.ts");
        return buildTravelSearch(p as never);
      }
      case "stripe.create_checkout_link": {
        if (!input.approved) throw new Error("Pagamentos exigem aprovação explícita");
        const { createCheckoutLink } = await import("./payments.ts");
        return createCheckoutLink(p as never);
      }
      case "imessage.get_attachment": {
        const index=Number(p.index ?? -1);
        if(!Number.isSafeInteger(index) || index < 0) throw new Error("index must be a non-negative integer");
        const result=await new ImessageConnector().attachment(String(p.messageGuid ?? ""),index);
        return { contentType:result.contentType, bytes:result.bytes };
      }
      case "imessage.list_messages": {
        const after=p.after === undefined ? undefined : Number(p.after);
        if(after !== undefined && (!Number.isSafeInteger(after) || after < 0))
          throw new Error("after must be a valid unix timestamp in milliseconds");
        return new ImessageConnector().messages(after);
      }
      case "imessage.send":
        return new ImessageConnector().send(String(p.chatId ?? ""),String(p.text ?? ""),true);
    }
  }
}
