import type { ComputerAction, ComputerGateway, ComputerObservation } from "./computer-gateway.ts";

async function checked(fetchImpl: typeof fetch, token: string, url: string, init?: RequestInit) {
  const response = await fetchImpl(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Browser worker ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response;
}

export class BrowserWorkerGateway implements ComputerGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private url(path: string) { return this.baseUrl.replace(/\/$/, '') + path; }

  async observe(computerId: string): Promise<ComputerObservation> {
    const [read, screenshot] = await Promise.all([
      checked(this.fetchImpl, this.token, this.url(`/sessions/${encodeURIComponent(computerId)}/read`)),
      checked(this.fetchImpl, this.token, this.url(`/sessions/${encodeURIComponent(computerId)}/screenshot`)),
    ]);
    const data = await read.json() as { url?: string; title?: string; text?: string };
    const bytes = Buffer.from(await screenshot.arrayBuffer()).toString('base64');
    return { computerId, url: data.url, title: data.title, text: data.text, screenshotB64: bytes, at: new Date().toISOString() };
  }

  async act(computerId: string, action: ComputerAction): Promise<ComputerObservation> {
    const id = encodeURIComponent(computerId);
    if (action.type === 'navigate')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/navigate`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: action.url }) });
    else if (action.type === 'click')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/input`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'click', x: action.x, y: action.y }) });
    else if (action.type === 'double_click')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/input`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'double_click', x: action.x, y: action.y }) });
    else if (action.type === 'type')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/input`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'text', text: action.text }) });
    else if (action.type === 'key')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/input`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'key', key: action.key }) });
    else if (action.type === 'scroll')
      await checked(this.fetchImpl, this.token, this.url(`/sessions/${id}/input`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'scroll', deltaX: action.deltaX, deltaY: action.deltaY, x: action.x, y: action.y }) });
    else if (action.type === 'shell')
      throw new Error('Shell execution requires a persistent computer gateway, not the browser worker');
    return this.observe(computerId);
  }
}