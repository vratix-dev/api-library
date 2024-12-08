import {
  ScheduledTaskRepository,
  Task,
  TaskStatus,
} from "@/repositories/scheduledTask.interface.js";
import { TaskRegistry } from "./taskRegistry.js";
import {
  taskTypeNotRegistered,
  unexpectedTaskStatus,
} from "./errors/scheduledTasks.js";
import { NoRetryPolicy } from "./taskRetryPolicy/noRetryPolicy.js";

export class TaskProcessorService {
  constructor(
    private scheduledTaskRepository: ScheduledTaskRepository,
    private registry: TaskRegistry,
    private processingBatchSize: number,
    private pollInterval: number
  ) {
    this.processTask = this.processTask.bind(this);
    this.processTasks();
  }

  private async submitTasksForProcessing(limit: number = 10): Promise<Task[]> {
    return this.scheduledTaskRepository.submitTasks(limit);
  }

  private async handleSuccessfulProcessing(task: Task) {
    return this.updateTaskStatus(task, "DONE");
  }

  private async handleProcessingStarted(task: Task) {
    return this.updateTaskStatus(task, "PROCESSING");
  }

  private async handleFailedProcessing(
    task: Task,
    error: Error | any
  ): Promise<Task> {
    const taskRegistration = this.registry.get(task.type);
    const retryPolicy = taskRegistration?.retryPolicy ?? new NoRetryPolicy();

    const retryTime = retryPolicy.getRetryTime(task, error);
    const newStatus: TaskStatus = retryTime != null ? "WAITING" : "ERROR";

    const preparedTask = {
      ...task,
      status: newStatus,
      runAfter: retryTime,
      retries: task.retries + 1,
    }

    const updatedTask = await this.scheduledTaskRepository.updateTask(preparedTask);

    return updatedTask;
  }

  private async updateTaskStatus(task: Task, newStatus: TaskStatus) {
    return this.scheduledTaskRepository.updateTask({
      ...task,
      status: newStatus,
    });
  }

  async processTask(task: Task) {
    try {
      if (task.status !== "SUBMITTED") {
        throw unexpectedTaskStatus(
          `Task id:${task.id} sent for processing but not in "SUBMITTED" state.`
        );
      }

      const taskRegistration = this.registry.get(task.type);

      if (taskRegistration == undefined) {
        throw taskTypeNotRegistered(task.type);
      }

      console.log(`Processing task id:${task.id}`);

      const { processor } = taskRegistration;

      const startedTask = await this.handleProcessingStarted(task);
      try {
        await processor(startedTask.payload);
        const successfulTask = await this.handleSuccessfulProcessing(
          startedTask
        );
      } catch (error) {
        console.error(`Failed to process task id:${task.id}`, error);
        const failedTask = await this.handleFailedProcessing(
          startedTask,
          error
        );
      }
    } catch (error) {
      console.error(`Failed to start processing task id:${task.id}`, error);
      const failedTask = await this.handleFailedProcessing(task, error);
    }
  }

  async processTasks(): Promise<void> {
    while (true) {
      const tasks = await this.submitTasksForProcessing(
        this.processingBatchSize
      ) ?? [];

      const asyncProcessors = tasks.map(this.processTask);

      await Promise.allSettled(asyncProcessors);

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }
}
