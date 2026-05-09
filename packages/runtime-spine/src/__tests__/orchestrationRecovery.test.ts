import { assert } from 'node:assert/strict';
import { createMemoryCheckpointStore } from '../checkpoints.js';
import { transitionRuntimeJob } from '../stateMachine.js';
import type { RuntimeJob } from '../types.js';

const checkpoints = createMemoryCheckpointStore();

const baseJob: RuntimeJob = {
  id: 'job-recovery-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-recovery-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const checkpointed = transitionRuntimeJob(baseJob, 'CHECKPOINTED');

await checkpoints.saveCheckpoint({
  id: 'checkpoint-recovery-1',
  jobId: checkpointed.id,
  tenantId: checkpointed.tenantId,
  projectId: checkpointed.projectId,
  traceId: checkpointed.traceId,
  state: checkpointed.state,
  sequence: 1,
  data: {
    completedStep: 'generate-runtime-plan',
  },
  createdAt: new Date().toISOString(),
});

const restored = await checkpoints.loadCheckpoint(baseJob.id);
assert.ok(restored);
assert.equal(restored?.state, 'CHECKPOINTED');
assert.equal(restored?.data.completedStep, 'generate-runtime-plan');

const resumed = transitionRuntimeJob(
  {
    ...checkpointed,
    state: 'CHECKPOINTED',
  },
  'EXECUTING',
);

assert.equal(resumed.state, 'EXECUTING');

console.log('orchestrationRecovery tests passed');
