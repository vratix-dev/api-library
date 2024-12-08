import { Task } from "@/repositories/scheduledTask.interface.js";

export interface TaskRetryPolicy {
    getRetryTime: (task: Task, error: Error | any) => Date | null
}