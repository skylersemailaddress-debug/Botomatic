import { assert } from 'node:assert/strict';
import { createMemoryCheckpointStore } from '../checkpoints.js';
import { createRuntimeCoordinator } from '../orchestrationCoordinator.js';
import { createMemoryRuntimeQueue } from '../queue.js';
import { createRuntimeValidatorEngine } from '../validatorRuntime.js';
import type { RuntimeJob } from '../types.js';

const queue = createMemoryRuntimeQueue();
const checkpoints = createMemoryCheckpointStore();
const validators = createRuntimeValidatorEngine();

const coordinator = createRuntimeCoordinator({
  queue,
  checkpoints,
  validators,
});

const job: RuntimeJob = {
  id: 'job-coordinator-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 2,
  traceId: 'trace-coordinator-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await coordinator.enqueue(job);

const executing = await coordinator.processNext('worker-1');
assert.ok(executing);
assert.equal(executing?.state, 'EXECUTING');

const checkpoint = await checkpoints.loadCheckpoint(job.id);
assert.ok(checkpoint);
assert.equal(checkpoint?.data.workerId, 'worker-1');

const retrying = await coordinator.fail(
  {
    ...executing!,
    state: 'EXECUTING',
  },
  'temporary-runtime-error',
);

assert.equal(retrying.state, 'RETRYING');
assert.equal(retrying.attempt, 1);

const deadLettered = await coordinator.fail(
  {
    ...retrying,
    state: 'EXECUTING',
    attempt: 2,
  },
  'max-attempts-exhausted',
);

assert.equal(deadLettered.state, 'DEAD_LETTER');

console.log('orchestrationCoordinator tests passed');
