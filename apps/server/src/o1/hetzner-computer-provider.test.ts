import { test, expect } from "node:test";
import { HetznerComputerProvider } from "./hetzner-computer-provider.ts";

function fakeFetch() {
  return async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify({ server: { id: 42, status: "initializing", public_net: { ipv4: { ip: "203.0.113.10" } } } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
}

test("creates a persistent computer through the provider seam", async () => {
  const provider = new HetznerComputerProvider(
    "secret-token",
    { image: "ubuntu-24.04", serverType: "cpx22", location: "fsn1" },
    fakeFetch(),
  );
  await expect(provider.create({ owner: "owner-1", name: "o1-42" })).resolves.toEqual({
    id: "42",
    kind: "persistent",
    status: "initializing",
    endpoint: "203.0.113.10",
  });
});

test("rejects malformed computer names before an API call", async () => {
  const provider = new HetznerComputerProvider("token", { image: "ubuntu-24.04", serverType: "cpx22" }, fakeFetch());
  await expect(provider.create({ owner: "owner", name: "bad name" })).rejects.toThrow(/Invalid computer name/);
});