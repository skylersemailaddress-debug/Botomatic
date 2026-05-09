import { assert } from 'node:assert/strict';
import { createMemoryCheckpointStore } from '../checkpoints.js';
import { createRuntimeValidatorEngine } from '../validatorRuntime.js';
import { createValidatorReplayOrchestrator } from '../validatorReplay.js';

const checkpoints = createMemoryCheckpointStore();
const validators = createRuntimeValidatorEngine();

await checkpoints.saveCheckpoint({
  id: 'checkpoint-replay-1',
  jobId: 'job-replay-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  traceId: 'trace-replay-1',
  state: 'VALIDATING',
  sequence: 1,
  data: {
    completedStep: 'validator-replay',
  },
  createdAt: new Date().toISOString(),
});

const replay = createValidatorReplayOrchestrator({
  checkpoints,
  validators,
});

const approved = await replay.replay('job-replay-1', {
  validatorId: 'validator-runtime-1',
  traceId: 'trace-replay-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  jobId: 'job-replay-1',
  status: 'APPROVED',
  reasons: [],
  createdAt: new Date().toISOString(),
});

assert.equal(approved.validator.status, 'APPROVED');
assert.equal(approved.checkpoint.jobId, 'job-replay-1');

await assert.rejects(
  () => replay.replay('missing-job', {
    validatorId: 'validator-runtime-2',
    traceId: 'trace-replay-2',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    jobId: 'missing-job',
    status: 'APPROVED',
    reasons: [],
    createdAt: new Date().toISOString(),
  }),
  /No checkpoint found/,
);

console.log('validatorReplay tests passed');
