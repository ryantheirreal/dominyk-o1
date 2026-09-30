import type { ComputerHandle, ComputerProvider } from "./computer-provider.ts";

interface HetznerResponse {
  server?: {
    id?: number;
    status?: string;
    public_net?: { ipv4?: { ip?: string } };
  };
}

export class HetznerComputerProvider implements ComputerProvider {
  readonly kind = "persistent" as const;
  private readonly baseUrl = "https://api.hetzner.cloud/v1";

  constructor(
    private readonly token: string,
    private readonly defaults: { image: string; serverType: string; location?: string },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Hetzner API ${response.status}: ${body.slice(0, 500)}`);
    }
    return (response.status === 204 ? {} : await response.json()) as HetznerResponse;
  }

  private handle(server: NonNullable<HetznerResponse['server']>): ComputerHandle {
    if (server.id === undefined) throw new Error("Hetzner response did not include a server id");
    return {
      id: String(server.id),
      kind: "persistent",
      status: server.status ?? "unknown",
      ...(server.public_net?.ipv4?.ip ? { endpoint: server.public_net.ipv4.ip } : {}),
    };
  }

  async create(input: { owner: string; name: string; image?: string; region?: string; size?: string }) {
    const name = input.name.trim();
    if (!/^[a-z0-9][a-z0-9.-]{0,62}$/i.test(name)) throw new Error("Invalid computer name");
    if (!input.owner) throw new Error("Owner is required");
    const body: Record<string, string> = {
      name,
      server_type: input.size ?? this.defaults.serverType,
      image: input.image ?? this.defaults.image,
    };
    const location = input.region ?? this.defaults.location;
    if (location) body.location = location;
    const response = await this.request("/servers", { method: "POST", body: JSON.stringify(body) });
    if (!response.server) throw new Error("Hetzner create response did not include a server");
    return this.handle(response.server);
  }

  async get(id: string) { return this.handle((await this.request(`/servers/${encodeURIComponent(id)}`)).server ?? {}); }
  async start(id: string) { await this.request(`/servers/${encodeURIComponent(id)}/actions/poweron`, { method: "POST", body: "{}" }); }
  async stop(id: string) { await this.request(`/servers/${encodeURIComponent(id)}/actions/shutdown`, { method: "POST", body: "{}" }); }
  async destroy(id: string) { await this.request(`/servers/${encodeURIComponent(id)}`, { method: "DELETE" }); }
}