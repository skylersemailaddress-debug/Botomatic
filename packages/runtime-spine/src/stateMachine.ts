import type { RuntimeExecutionState, RuntimeJob } from './types.js';

const allowedTransitions: Record<RuntimeExecutionState, RuntimeExecutionState[]> = {
  REQUESTED: ['PLANNED', 'BLOCKED', 'FAILED'],
  PLANNED: ['QUEUED', 'BLOCKED', 'FAILED'],
  QUEUED: ['EXECUTING', 'BLOCKED', 'FAILED'],
  EXECUTING: ['CHECKPOINTED', 'VALIDATING', 'RETRYING', 'BLOCKED', 'FAILED'],
  CHECKPOINTED: ['EXECUTING', 'VALIDATING', 'RETRYING', 'BLOCKED', 'FAILED'],
  VALIDATING: ['COMPLETED', 'BLOCKED', 'RETRYING', 'FAILED'],
  RETRYING: ['QUEUED', 'DEAD_LETTER'],
  BLOCKED: ['QUEUED', 'FAILED'],
  FAILED: ['RETRYING', 'DEAD_LETTER'],
  COMPLETED: [],
  DEAD_LETTER: [],
};

export function canTransitionRuntimeJob(from: RuntimeExecutionState, to: RuntimeExecutionState): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function transitionRuntimeJob(job: RuntimeJob, nextState: RuntimeExecutionState, metadata?: { reason?: string }): RuntimeJob {
  if (!canTransitionRuntimeJob(job.state, nextState)) {
    throw new Error(`Invalid runtime job transition: ${job.state} -> ${nextState}`);
  }

  const next: RuntimeJob = {
    ...job,
    state: nextState,
    updatedAt: new Date().toISOString(),
  };

  if (nextState === 'BLOCKED' && metadata?.reason) {
    next.blockedReason = metadata.reason;
  }

  if ((nextState === 'FAILED' || nextState === 'DEAD_LETTER') && metadata?.reason) {
    next.failedReason = metadata.reason;
  }

  if (nextState === 'RETRYING') {
    next.attempt = job.attempt + 1;
  }

  return next;
}

export function shouldDeadLetter(job: RuntimeJob): boolean {
  return job.attempt >= job.maxAttempts;
}
