import type { RuntimeCancellationStore } from './cancellation.js';
import type { RuntimeJob } from './types.js';

export interface RuntimeCancellationPropagationResult {
  jobId: string;
  traceId: string;
  cancelled: boolean;
  reason?: string;
  evaluatedAt: string;
}

export function createCancellationPropagation(store: RuntimeCancellationStore) {
  return {
    async evaluate(job: RuntimeJob): Promise<RuntimeCancellationPropagationResult> {
      const request = await store.get(job.id);

      if (!request) {
        return {
          jobId: job.id,
          traceId: job.traceId,
          cancelled: false,
          evaluatedAt: new Date().toISOString(),
        };
      }

      return {
        jobId: job.id,
        traceId: job.traceId,
        cancelled: true,
        reason: request.reason,
        evaluatedAt: new Date().toISOString(),
      };
    },
  };
}
