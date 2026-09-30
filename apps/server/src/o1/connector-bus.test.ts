import { test, expect } from "node:test";
import { operationRisk } from "./connector-bus.ts";

test("connector reads are classified as read", () => {
  expect(operationRisk("github.search_repositories")).toBe("read");
  expect(operationRisk("notion.search","imessage.get_attachment")).toBe("read");
});

test("connector sends are classified as external", () => {
  expect(operationRisk("github.get_user")).not.toBe("external");
  expect(operationRisk("imessage.send")).toBe("external");
  expect(operationRisk("slack.send_message")).toBe("external");
});
