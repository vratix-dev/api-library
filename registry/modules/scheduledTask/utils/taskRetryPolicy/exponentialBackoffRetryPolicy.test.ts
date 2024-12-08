import { describe, beforeEach, it, expect } from "vitest";
import { ExponentialBackoffRetryPolicy } from "./exponentialBackoffRetryPOlicy.js";
import { Task } from "@/repositories/scheduledTask.interface.js";

describe("ExponentialBackoffRetryPolicy", () => {
  const delayDurationMillis = 1000;
  const multiplier = 2;
  const maxCount = 5;
  const maxDelayMillis = 10000;

  let policy: ExponentialBackoffRetryPolicy;

  beforeEach(() => {
    policy = new ExponentialBackoffRetryPolicy(
      delayDurationMillis,
      multiplier,
      maxCount,
      maxDelayMillis
    );
  });

  it("should return null if retries exceed maxCount", () => {
    const task: Task = {
      type: "example",
      payload: {},
      status: "PROCESSING",
      retries: maxCount,
      version: 1,
      runAfter: new Date(),
    };
    expect(policy.getRetryTime(task)).toBeNull();
  });

  it("should calculate exponential backoff delay correctly", () => {
    const task: Task = {
      type: "example",
      payload: {},
      status: "PROCESSING",
      retries: 3,
      version: 1,
      runAfter: new Date(),
    };
    const expectedDelay =
      delayDurationMillis * Math.pow(multiplier, task.retries);
    const expectedTime = new Date(Date.now() + expectedDelay);

    const retryTime = policy.getRetryTime(task);
    expect(retryTime).not.toBeNull();
    expect(retryTime!.getTime()).toBeCloseTo(expectedTime.getTime(), -2); // Allow small rounding differences
  });

  it("should return a valid retry time for first retry", () => {
    const task: Task = {
      type: "example",
      payload: {},
      status: "PROCESSING",
      retries: 0,
      version: 1,
      runAfter: new Date(),
    };
    const expectedDelay = delayDurationMillis;
    const expectedTime = new Date(Date.now() + expectedDelay);

    const retryTime = policy.getRetryTime(task);
    expect(retryTime).not.toBeNull();
    expect(retryTime!.getTime()).toBeCloseTo(expectedTime.getTime(), -2);
  });

  it("handles large number of retries correctly", () => {
    policy = new ExponentialBackoffRetryPolicy(
      delayDurationMillis,
      multiplier,
      Number.MAX_SAFE_INTEGER + 10,
      maxDelayMillis
    );

    const task: Task = {
      type: "example",
      payload: {},
      status: "PROCESSING",
      retries: Number.MAX_SAFE_INTEGER,
      version: 1,
      runAfter: new Date(),
    };
    const expectedDelay = maxDelayMillis;
    const expectedTime = new Date(Date.now() + expectedDelay);

    const retryTime = policy.getRetryTime(task);
    expect(retryTime).not.toBeNull();
    expect(retryTime!.getTime()).toBeCloseTo(expectedTime.getTime(), -2);
  });
});
