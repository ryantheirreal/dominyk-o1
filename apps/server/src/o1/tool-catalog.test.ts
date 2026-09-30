import { test, expect } from "node:test";
import { discoverTools } from "./tool-catalog.ts";

test("discovers browser tools from task vocabulary", () => {
  const tools = discoverTools("browser click form", { limit: 3 });
  expect(tools[0]?.id).toBe("browser_input");
});

test("filters tools by risk and keeps read-only discovery deterministic", () => {
  const tools = discoverTools("browser", { risk: "read" });
  expect(tools.map((tool) => tool.id)).toEqual(["browse_web"]);
});