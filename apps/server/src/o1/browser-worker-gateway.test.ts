import { test, expect } from "node:test";
import { BrowserWorkerGateway } from "./browser-worker-gateway.ts";

test("observes a browser worker session with text and screenshot", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/read')) return new Response(JSON.stringify({ url: 'https://example.com', title: 'Example', text: 'hello' }), { status: 200 });
    if (url.endsWith('/screenshot')) return new Response(new Uint8Array([1,2,3]), { status: 200 });
    throw new Error('unexpected');
  };
  const gateway = new BrowserWorkerGateway('https://worker', 'token', fetchImpl);
  const result = await gateway.observe('abcd');
  expect(result.computerId).toBe('abcd');
  expect(result.text).toBe('hello');
  expect(result.screenshotB64).toBe('AQID');
  expect(calls).toHaveLength(2);
});

test("translates O1 click actions to the browser worker input contract", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? String(init.body) : undefined });
    if (url.endsWith('/read')) return new Response(JSON.stringify({ url: 'https://example.com', title: 'Example', text: 'hello' }), { status: 200 });
    if (url.endsWith('/screenshot')) return new Response(new Uint8Array([1]), { status: 200 });
    if (url.endsWith('/input')) return new Response('{}', { status: 200 });
    throw new Error('unexpected');
  };
  const gateway = new BrowserWorkerGateway('https://worker', 'token', fetchImpl);
  await gateway.act('abcd', { type: 'click', x: 10, y: 20 });
  const input = calls.find((item) => item.url.endsWith('/input'));
  expect(input?.body).toBe(JSON.stringify({ type: 'click', x: 10, y: 20 }));
});