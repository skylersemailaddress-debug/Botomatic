import { assert } from 'node:assert/strict';
import { shouldDeadLetter, transitionRuntimeJob } from '../stateMachine.js';
import type { RuntimeJob } from '../types.js';

function createJob(overrides: Partial<RuntimeJob> = {}): RuntimeJob {
  return {
    id: 'job-retry-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    buildContractId: 'contract-1',
    state: 'FAILED',
    attempt: 0,
    maxAttempts: 2,
    traceId: 'trace-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

const firstRetry = transitionRuntimeJob(createJob(), 'RETRYING');
assert.equal(firstRetry.state, 'RETRYING');
assert.equal(firstRetry.attempt, 1);
assert.equal(shouldDeadLetter(firstRetry), false);

const secondFailure = transitionRuntimeJob(
  {
    ...firstRetry,
    state: 'FAILED',
  },
  'RETRYING',
);
assert.equal(secondFailure.attempt, 2);
assert.equal(shouldDeadLetter(secondFailure), true);

const deadLetter = transitionRuntimeJob(secondFailure, 'DEAD_LETTER', {
  reason: 'max-attempts-exhausted',
});
assert.equal(deadLetter.state, 'DEAD_LETTER');
assert.equal(deadLetter.failedReason, 'max-attempts-exhausted');

console.log('retryDeadLetter tests passed');
