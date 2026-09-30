import { test, expect } from "node:test";
import { createActionBarrier } from "./action-barrier.ts";

test("closed barrier refuses new work", () => {
  const barrier=createActionBarrier();
  barrier.close();
  expect(()=>barrier.enter()).toThrow();
});

test("drain waits for admitted work", async () => {
  const barrier=createActionBarrier();
  const release=barrier.enter();
  const pending=barrier.drain(1000);
  release();
  await pending;
  expect(barrier.pending()).toBe(0);
});
