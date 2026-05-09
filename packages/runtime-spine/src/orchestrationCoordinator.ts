import { transitionRuntimeJob, shouldDeadLetter } from './stateMachine.js';
import type { RuntimeCheckpointStore } from './checkpoints.js';
import type { RuntimeQueue } from './queue.js';
import type { RuntimeValidatorEngine } from './validatorRuntime.js';
import type { RuntimeJob } from './types.js';

export interface RuntimeCoordinatorDependencies {
  queue: RuntimeQueue;
  checkpoints: RuntimeCheckpointStore;
  validators: RuntimeValidatorEngine;
}

export function createRuntimeCoordinator(deps: RuntimeCoordinatorDependencies) {
  return {
    async enqueue(job: RuntimeJob) {
      await deps.queue.enqueue(job);
    },

    async processNext(workerId: string): Promise<RuntimeJob | null> {
      const claimed = await deps.queue.claim();

      if (!claimed) {
        return null;
      }

      const executing = transitionRuntimeJob(claimed, 'EXECUTING');

      await deps.checkpoints.saveCheckpoint({
        id: `checkpoint-${executing.id}-${executing.attempt}`,
        jobId: executing.id,
        tenantId: executing.tenantId,
        projectId: executing.projectId,
        traceId: executing.traceId,
        state: executing.state,
        sequence: executing.attempt,
        data: {
          workerId,
          executionState: executing.state,
        },
        createdAt: new Date().toISOString(),
      });

      return executing;
    },

    async fail(job: RuntimeJob, reason: string): Promise<RuntimeJob> {
      const failed = transitionRuntimeJob(job, 'FAILED', { reason });

      if (shouldDeadLetter(failed)) {
        const deadLettered = transitionRuntimeJob(failed, 'DEAD_LETTER', {
          reason: 'max-attempts-exhausted',
        });

        await deps.queue.deadLetter(deadLettered);

        return deadLettered;
      }

      const retrying = transitionRuntimeJob(failed, 'RETRYING');
      await deps.queue.retry(retrying);

      return retrying;
    },
  };
}
