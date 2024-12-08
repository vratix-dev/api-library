import { NoRetryPolicy } from "./taskRetryPolicy/noRetryPolicy.js";
import { TaskRetryPolicy } from "./taskRetryPolicy/taskRetryPolicy.js";

export type TaskProcessor<TPayload = any> = (
  payload: TPayload
) => Promise<void>;

export interface TaskRegistration {
  processor: TaskProcessor;
  retryPolicy: TaskRetryPolicy;
}

export class TaskRegistry {
  private registry: Map<string, TaskRegistration> = new Map();
  static #instance: TaskRegistry | null = null;

  constructor() {
    if (TaskRegistry.#instance) {
      return TaskRegistry.#instance;
    }

    TaskRegistry.#instance = this;
  }

  register(
    type: string,
    processor: TaskProcessor,
    retryPolicy?: TaskRetryPolicy
  ): void {
    if (this.registry.has(type)) {
      throw new Error(`Processor for type "${type}" is already registered.`);
    }

    this.registry.set(type, {
      processor,
      retryPolicy: retryPolicy ?? new NoRetryPolicy(),
    });
  }

  get(type: string): TaskRegistration {
    const registration = this.registry.get(type);
    if (!registration) {
      throw new Error(`No processor registered for type "${type}".`);
    }
    return registration;
  }

  static destroy(){
    TaskRegistry.#instance = null
  }
}
