export type TaskStatus = "SUBMITTED" | "PROCESSING" | "WAITING" | "DONE" | "ERROR" | "FAILED";

export interface Task {
    id?: number;
    type: string;
    payload: Object;
    status: TaskStatus;
    retries: number;
    version: number;
    runAfter: Date | undefined | null;
    lastAttemptTime?: Date;
    nextRetryTime?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }

export interface ScheduledTaskRepository {
  getTaskById: (taskId: number) => Promise<Task>;
  saveTask: (task: Task) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  submitTasks: (limit: number) => Promise<Task[]>
}