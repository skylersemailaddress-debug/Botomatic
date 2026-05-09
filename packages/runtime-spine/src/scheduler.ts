import type { RuntimeJob } from './types.js';
import type { RuntimeQueue } from './queue.js';

export interface RuntimeScheduler {
  schedule(job: RuntimeJob): Promise<void>;
  next(): Promise<RuntimeJob | null>;
}

export function createRuntimeScheduler(queue: RuntimeQueue): RuntimeScheduler {
  return {
    async schedule(job) {
      if (job.state !== 'QUEUED') {
        throw new Error(`Runtime scheduler can only schedule QUEUED jobs. Received: ${job.state}`);
      }

      await queue.enqueue(job);
    },

    async next() {
      return queue.claim();
    },
  };
}
