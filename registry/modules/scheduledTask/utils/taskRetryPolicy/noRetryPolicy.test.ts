import { describe, beforeEach, it, expect } from "vitest";
import { Task } from "@/repositories/scheduledTask.interface.js";
import { NoRetryPolicy } from "./noRetryPolicy.js";
import { TaskRetryPolicy } from "./taskRetryPolicy.js";

describe("NoRetryPolicy", () => {
  let policy: TaskRetryPolicy;

  beforeEach(() => {
    policy = new NoRetryPolicy();
  });

  it("should return null", () => {
    const task: Task = {
      type: "example",
      payload: {},
      status: "PROCESSING",
      retries: 1,
      version: 1,
      runAfter: new Date(),
    };
    expect(policy.getRetryTime(task, null)).toBeNull();
  });
});
