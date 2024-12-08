import { describe, beforeEach, it, vi, Mock, expect } from "vitest";
import { TaskScheduler } from "./taskScheduler.js";
import { ScheduledTaskRepository } from "@/repositories/scheduledTask.interface.js";
import { TaskRegistry } from "./taskRegistry.js";
import { TaskProcessorService } from "./taskProcessorService.js";

describe("TaskScheduler", () => {
  let taskScheduler: TaskScheduler;
  let mockScheduledTaskRepository: ScheduledTaskRepository;
  let mockRegistry: TaskRegistry;
  let mockTaskProcessorService: TaskProcessorService;

  beforeEach(() => {
    vi.resetAllMocks()
    mockScheduledTaskRepository = {
      saveTask: vi.fn(),
    } as unknown as ScheduledTaskRepository;
    mockRegistry = {
      register: vi.fn(),
      get: vi.fn(),
    } as unknown as TaskRegistry;
    mockTaskProcessorService = {
      processTask: vi.fn(),
    } as unknown as TaskProcessorService;

    taskScheduler = new TaskScheduler(
      mockScheduledTaskRepository,
      mockRegistry,
      mockTaskProcessorService
    );
  });

  it("schedules a new task and sends it for processing right away", async () => {
    (mockRegistry.get as Mock).mockReturnValue(true);
    (mockScheduledTaskRepository.saveTask as Mock).mockImplementation(async (task) =>
      task
    );

    await taskScheduler.scheduleTask("example", { foo: "bar" });

    expect(mockScheduledTaskRepository.saveTask).toHaveBeenCalledTimes(1);
    expect(mockScheduledTaskRepository.saveTask).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "example",
        payload: JSON.stringify({ foo: "bar" }),
        status: "SUBMITTED",
        retries: 0,
        version: 0,
      })
    );

    
    expect(mockTaskProcessorService.processTask).toHaveBeenCalledTimes(1);
    expect(mockTaskProcessorService.processTask).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "example",
        payload: JSON.stringify({ foo: "bar" }),
        status: "SUBMITTED",
        retries: 0,
        version: 0,
      })
    );
  });


  it("schedules a new task and does not process it right away", async () => {
    (mockRegistry.get as Mock).mockReturnValue(true);
    (mockScheduledTaskRepository.saveTask as Mock).mockImplementation(async (task) =>
      task
    );

    await taskScheduler.scheduleTask("example", { foo: "bar" }, new Date(new Date().getTime() + 10000));

    expect(mockScheduledTaskRepository.saveTask).toHaveBeenCalledTimes(1);
    expect(mockScheduledTaskRepository.saveTask).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: "example",
        payload: JSON.stringify({ foo: "bar" }),
        status: "WAITING",
        retries: 0,
        version: 0,
      })
    );

    
    expect(mockTaskProcessorService.processTask).toHaveBeenCalledTimes(0);
  });
});
