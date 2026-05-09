import type { RuntimeJob } from './types.js';

export interface RuntimeQueue {
  enqueue(job: RuntimeJob): Promise<void>;
  claim(): Promise<RuntimeJob | null>;
  acknowledge(jobId: string): Promise<void>;
  retry(job: RuntimeJob): Promise<void>;
  deadLetter(job: RuntimeJob): Promise<void>;
  size(): Promise<number>;
}

export function createMemoryRuntimeQueue(): RuntimeQueue {
  const queue: RuntimeJob[] = [];
  const deadLetters: RuntimeJob[] = [];

  return {
    async enqueue(job) {
      queue.push(job);
    },

    async claim() {
      return queue.shift() ?? null;
    },

    async acknowledge(_jobId) {
      return;
    },

    async retry(job) {
      queue.push({
        ...job,
        state: 'RETRYING',
        updatedAt: new Date().toISOString(),
      });
    },

    async deadLetter(job) {
      deadLetters.push({
        ...job,
        state: 'DEAD_LETTER',
        updatedAt: new Date().toISOString(),
      });
    },

    async size() {
      return queue.length;
    },
  };
}
