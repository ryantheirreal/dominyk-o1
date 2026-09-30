import { test, expect } from "node:test";
import { readyTaskBatches, validateTaskGraph, type O1TaskNode } from "./task-graph.ts";

const graph: O1TaskNode[] = [
  { id: "a", missionId: "m", title: "Research", dependsOn: [], status: "pending" },
  { id: "b", missionId: "m", title: "Build", dependsOn: [], status: "pending" },
  { id: "c", missionId: "m", title: "Review", dependsOn: ["a", "b"], status: "pending" },
];

test("returns independent tasks in the same ready batch", () => {
  expect(readyTaskBatches(graph)).toEqual(["a", "b"]);
});

test("unlocks dependent work after prerequisites complete", () => {
  const next = graph.map((node) => node.id === "a" || node.id === "b" ? { ...node, status: "completed" as const } : node);
  expect(readyTaskBatches(next)).toEqual(["c"]);
});

test("rejects dependency cycles", () => {
  const cyclic = [
    { ...graph[0], dependsOn: ["c"] },
    graph[1],
    graph[2],
  ];
  expect(() => validateTaskGraph(cyclic)).toThrow(/cycle/);
});