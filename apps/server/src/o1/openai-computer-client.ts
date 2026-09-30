import { parseOpenAIComputerCall, type O1ComputerCall } from './openai-computer-call.ts';

export interface O1ResponsesComputerClient {
  start(input: string): Promise<{ responseId: string; computerCall?: O1ComputerCall; output: unknown[] }>;
  continueWithScreenshot(responseId: string, callId: string, screenshotBase64: string): Promise<{ responseId: string; computerCall?: O1ComputerCall; output: unknown[] }>;
}

interface ResponsesPayload {
  id?: string;
  output?: unknown[];
  status?: string;
}

export class OpenAIResponsesComputerClient implements O1ResponsesComputerClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request(body: Record<string, unknown>): Promise<ResponsesPayload> {
    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as ResponsesPayload | null;
    if (!response.ok) throw new Error('OpenAI Responses API ' + response.status);
    if (!payload?.id || !Array.isArray(payload.output)) throw new Error('OpenAI Responses API returned an invalid response');
    if (payload.status && payload.status !== 'completed') throw new Error('OpenAI Responses API returned status ' + payload.status);
    return payload;
  }

  private parse(payload: ResponsesPayload) {
    const item = (payload.output ?? []).find((entry) => Boolean(entry && typeof entry === 'object' && (entry as { type?: unknown }).type === 'computer_call'));
    return { responseId: payload.id!, computerCall: item ? parseOpenAIComputerCall(item) : undefined, output: payload.output ?? [] };
  }

  async start(input: string) {
    const payload = await this.request({ model: this.model, tools: [{ type: 'computer' }], input });
    return this.parse(payload);
  }

  async continueWithScreenshot(responseId: string, callId: string, screenshotBase64: string) {
    const payload = await this.request({
      model: this.model,
      tools: [{ type: 'computer' }],
      previous_response_id: responseId,
      input: [{
        type: 'computer_call_output',
        call_id: callId,
        output: { type: 'computer_screenshot', image_url: 'data:image/png;base64,' + screenshotBase64, detail: 'original' },
      }],
    });
    return this.parse(payload);
  }
}