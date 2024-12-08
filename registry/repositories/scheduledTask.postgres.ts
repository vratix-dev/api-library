import {
  ScheduledTaskRepository,
  Task,
} from "./scheduledTask.interface.js";

/* export class Task {
  constructor(
    public id: string,
    public type: string,
    public payload: any,
    public status: TaskStatus,
    public retries: number,
    public version: number,
    public scheduledTime: Date,
    public lastAttemptTime?: Date,
    public nextRetryTime?: Date,
    public createdAt?: Date,
    public updatedAt?: Date
  ) {}

  static fromRaw(raw: any): Task {
    return new Task(
      raw.id,
      raw.type,
      JSON.parse(raw.payload),
      raw.status as TaskStatus,
      raw.retries,
      raw.version,
      new Date(raw.scheduled_time),
      raw.last_attempt_time ? new Date(raw.last_attempt_time) : undefined,
      raw.next_retry_time ? new Date(raw.next_retry_time) : undefined,
      raw.created_at ? new Date(raw.created_at) : undefined,
      raw.updated_at ? new Date(raw.updated_at) : undefined
    );
  }
} */

export const createScheduledTaskRepository = (): ScheduledTaskRepository => {
  // TODO: Implement
  return {
    getTaskById: (taskId: number) => null as unknown as Promise<Task>,
    saveTask: (task: Task) => null as unknown as Promise<Task>,
    updateTask: (task: Task) => null as unknown as Promise<Task>,
    submitTasks: (limit: number) => null as unknown as Promise<Task[]>,
  };
};
