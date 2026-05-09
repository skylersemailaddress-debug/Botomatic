import type { RuntimeJob } from './types.js';
import type { RuntimeQueue } from './queue.js';

export interface RuntimeRedisClient {
  lpush(key: string, value: string): Promise<number>;
  rpop(key: string): Promise<string | null>;
}

export interface RedisRuntimeQueueOptions {
  queueKey: string;
}

export function createRedisRuntimeQueue(client: RuntimeRedisClient, options: RedisRuntimeQueueOptions): RuntimeQueue {
  return {
    async enqueue(job: RuntimeJob) {
      await client.lpush(options.queueKey, JSON.stringify(job));
    },

    async claim() {
      const payload = await client.rpop(options.queueKey);
      return payload ? (JSON.parse(payload) as RuntimeJob) : null;
    },

    async acknowledge(_jobId: string) {
      return;
    },

    async retry(job: RuntimeJob) {
      await client.lpush(options.queueKey, JSON.stringify({
        ...job,
        state: 'RETRYING',
      }));
    },

    async deadLetter(_job: RuntimeJob) {
      return;
    },

    async size() {
      return 0;
    },
  };
}
