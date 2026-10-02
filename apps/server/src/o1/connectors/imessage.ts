export interface ImessageMessage {
  guid: string;
  text: string | null;
  date: number;
  is_from_me: boolean;
  sender: string | null;
  chat_guid: string;
  attachments: unknown[];
}

interface ImessageInfo {
  name?: string;
  hostname?: string;
  port?: number;
  version?: string;
}

export class ImessageConnector {
  readonly id = "imessage";
  private readonly baseUrl = (process.env.IMESSAGE_BRIDGE_URL ?? "").replace(/\/$/, "");
  private readonly token = process.env.IMESSAGE_BRIDGE_TOKEN ?? "";

  private headers() { return { "X-Bridge-Token": this.token }; }

  private assertConfigured() {
    if (!this.baseUrl || !this.token) throw new Error("iMessage bridge is not configured");
  }

  async health() {
    if (!this.baseUrl || !this.token) return { ok:false, detail:"Set IMESSAGE_BRIDGE_URL and IMESSAGE_BRIDGE_TOKEN" };
    try {
      const response = await fetch(this.baseUrl + "/info", { headers:this.headers(), signal:AbortSignal.timeout(5000) });
      if (!response.ok) return { ok:false, detail:"iMessage bridge returned HTTP " + response.status };
      const info = (await response.json()) as ImessageInfo;
      const label = info.name ?? info.hostname ?? "iMessage bridge";
      return { ok:true, detail:"Connected to " + label + (info.version ? " v" + info.version : "") };
    } catch (error) {
      return { ok:false, detail:error instanceof Error ? error.message : "iMessage bridge unavailable" };
    }
  }

  async messages(after?: number): Promise<ImessageMessage[]> {
    this.assertConfigured();
    const query = after === undefined ? "" : "?after=" + encodeURIComponent(String(after));
    const response = await fetch(this.baseUrl + "/messages" + query, { headers:this.headers(), signal:AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("iMessage read failed (" + response.status + ")");
    return (await response.json()) as ImessageMessage[];
  }

  async send(chatId: string, text: string, confirmation = false, attachment?: { path?: string; b64?: string; name?: string }) {
    this.assertConfigured();
    if (!confirmation) throw new Error("iMessage send requires explicit O1 approval");
    const response = await fetch(this.baseUrl + "/send", {
      method:"POST",
      headers:{ ...this.headers(), "Content-Type":"application/json" },
      body:JSON.stringify({ chat_id:chatId, text, ...(attachment?.path ? { attachment_path: attachment.path } : {}), ...(attachment?.b64 ? { attachment_b64: attachment.b64, attachment_name: attachment.name ?? "image" } : {}) }),
      signal:AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "iMessage send failed (" + response.status + ")");
    return payload as { status:string; attachment_sent?:boolean; text_sent?:boolean };
  }
  async attachment(messageGuid: string, index: number) {
    this.assertConfigured();
    if (!Number.isSafeInteger(index) || index < 0) throw new Error("attachment index must be a non-negative integer");
    const url=this.baseUrl + "/attachment?msg=" + encodeURIComponent(messageGuid) + "&index=" + index;
    const response=await fetch(url,{headers:this.headers(),signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error("iMessage attachment read failed (" + response.status + ")");
    return {
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      bytes: await response.arrayBuffer(),
    };
  }
}
