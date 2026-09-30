import { test, expect } from "node:test";
import { HttpComputerGateway } from "./computer-gateway.ts";

test("sends scoped observation requests to the computer gateway", async () => {
  const seen: Array<{ input: string; init?: RequestInit }> = [];
  const gateway = new HttpComputerGateway("https://computer.example/", "server-secret", async (input, init) => {
    seen.push({ input: String(input), init });
    return new Response(JSON.stringify({ computerId: "42", text: "ok", at: "2026-01-01T00:00:00.000Z" }), { status: 200 });
  });
  await gateway.observe("42");
  await gateway.act("42", { type: "key", key: "ENTER" });
  expect(seen[0].input).toBe("https://computer.example/v1/computers/42/observe");
  expect(seen[1].input).toBe("https://computer.example/v1/computers/42/actions");
  expect((seen[1].init?.headers as Record<string,string>).Authorization).toBe("Bearer server-secret");
});