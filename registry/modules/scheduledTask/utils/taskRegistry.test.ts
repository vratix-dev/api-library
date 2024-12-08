import { describe, beforeEach, it, expect } from "vitest";
import { TaskRegistry } from "./taskRegistry.js";

describe("TaskRegistry", () => {
  describe("class construction", () => {
    it("is a singleton", () => {
      const firstInstance = new TaskRegistry();
      const secondInstance = new TaskRegistry();
      expect(firstInstance).toEqual(secondInstance);
    });
  });

  let taskRegistry: TaskRegistry;

  beforeEach(() => {
    TaskRegistry.destroy();
    taskRegistry = new TaskRegistry();
  });

  it("does not allow same task type to be registered multiple times", () => {
    taskRegistry.register("example", async () => {});
    expect(() => taskRegistry.register("example", async () => {})).toThrow(
      Error
    );
  });

  it("can register multiple task types", () => {
    taskRegistry.register("example", async () => {});
    taskRegistry.register("example1", async () => {});
    taskRegistry.register("example2", async () => {});
    taskRegistry.register("example3", async () => {});

    expect(() => taskRegistry.get("example")).not.toThrowError();
    expect(() => taskRegistry.get("example1")).not.toThrowError();
    expect(() => taskRegistry.get("example2")).not.toThrowError();
    expect(() => taskRegistry.get("example3")).not.toThrowError();
  });

  it("error thrown if task type does not exist", () => {
    taskRegistry.register("example", async () => {});

    expect(() => taskRegistry.get("example1")).toThrow(Error);
  });
});
