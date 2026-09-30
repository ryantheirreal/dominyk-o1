export type ComputerAction =
  | { type: "click"; x: number; y: number }
  | { type: "double_click"; x: number; y: number }
  | { type: "type"; text: string }
  | { type: "key"; key: string }
  | { type: "scroll"; deltaX: number; deltaY: number }
  | { type: "navigate"; url: string }
  | { type: "shell"; command: string; cwd?: string };

export interface ComputerObservation {
  computerId: string;
  url?: string;
  title?: string;
  screenshotB64?: string;
  text?: string;
  tabs?: Array<{ id: string; title: string; url: string }>;
  processes?: Array<{ pid: number; command: string }>;
  at: string;
}

export interface ComputerGateway {
  observe(computerId: string): Promise<ComputerObservation>;
  act(computerId: string, action: ComputerAction): Promise<ComputerObservation>;
}

export class HttpComputerGateway implements ComputerGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request(path: string, body?: unknown) {
    const response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Computer gateway ${response.status}: ${message.slice(0, 500)}`);
    }
    return (await response.json()) as ComputerObservation;
  }

  observe(computerId: string) { return this.request(`/v1/computers/${encodeURIComponent(computerId)}/observe`); }
  act(computerId: string, action: ComputerAction) { return this.request(`/v1/computers/${encodeURIComponent(computerId)}/actions`, action); }
}