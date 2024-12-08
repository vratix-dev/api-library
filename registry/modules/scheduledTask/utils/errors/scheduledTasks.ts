import { Task } from "@/repositories/scheduledTask.interface.js";

export const taskTypeNotRegistered = (taskType: Task["type"]) => {
  return new Error(
    `No processor for type:${taskType} has been registered. This task can not be scheduled or processed until a processor for type:${taskType} has been registered.`
  );
};

export const unexpectedTaskStatus = (message: string) => {
  return new Error(message);
};
