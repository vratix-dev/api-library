import { Task } from "@/repositories/scheduledTask.interface.js";
import { TaskRetryPolicy } from "./taskRetryPolicy.js";

class ExponentialBackoffRetryPolicy implements TaskRetryPolicy {
  constructor(
    private delayDurationMillis: number,
    private multiplier: number,
    private maxCount: number,
    private maxDelayMillis: number
  ) {}

  getRetryTime(task: Task) {
    const triesCount = task.retries + 1;

    if (triesCount >= this.maxCount) {
      return null;
    }

    let addedTimeMillis = 0;

    try {
      if (triesCount > Number.MAX_SAFE_INTEGER) {
        addedTimeMillis = this.maxDelayMillis;
      } else {
        addedTimeMillis =
          this.delayDurationMillis * Math.pow(this.multiplier, triesCount - 1);
        if (addedTimeMillis > this.maxDelayMillis) {
          addedTimeMillis = this.maxDelayMillis;
        }
      }
    } catch (error) {
      addedTimeMillis = this.maxDelayMillis;
    }

    const currentMillis = new Date().getTime();

    return new Date(currentMillis + addedTimeMillis);
  }
}

export { ExponentialBackoffRetryPolicy };
