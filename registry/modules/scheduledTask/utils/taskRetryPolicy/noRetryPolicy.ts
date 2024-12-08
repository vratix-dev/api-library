import { TaskRetryPolicy } from "./taskRetryPolicy.js";

class NoRetryPolicy implements TaskRetryPolicy {
  getRetryTime() {
    return null;
  }
}

export { NoRetryPolicy };
