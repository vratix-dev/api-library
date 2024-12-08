import {
  ScheduledTaskRepository,
  Task,
  TaskStatus,
} from "@/repositories/scheduledTask.interface.js";
import { TaskRegistry } from "./taskRegistry.js";
import { TaskProcessorService } from "./taskProcessorService.js";

export class TaskScheduler {
  constructor(
    private scheduledTaskRepository: ScheduledTaskRepository,
    private registry: TaskRegistry,
    private taskProcessorService: TaskProcessorService
  ) {}

  async scheduleTask<TPayload>(
    type: string,
    payload: TPayload,
    scheduledTime: Date = new Date()
  ): Promise<void> {
    if (!this.registry.get(type)) {
      throw new Error(
        `Unknown task type: "${type}". Register a processor first.`
      );
    }

    const currentDate = new Date();
    const status: TaskStatus =
      currentDate.getTime() >= scheduledTime.getTime()
        ? "SUBMITTED"
        : "WAITING";

    const task: Task = {
      type,
      payload: JSON.stringify(payload),
      status,
      retries: 0,
      version: 0,
      runAfter: scheduledTime,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedTask = await this.scheduledTaskRepository.saveTask(task);

    if (savedTask.status === "SUBMITTED") {
      this.taskProcessorService.processTask(savedTask)
    }
  }
}
