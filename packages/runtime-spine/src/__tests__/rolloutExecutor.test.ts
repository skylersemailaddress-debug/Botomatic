import { assert } from 'node:assert/strict';
import { createMemoryRolloutExecutor } from '../rolloutExecutor.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-rollout-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-rollout-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const executor = createMemoryRolloutExecutor();

const success = await executor.execute({
  job,
  deploymentId: 'deployment-rollout-1',
  environment: 'staging',
  strategy: 'blue-green',
  timeoutMs: 1000,
});

assert.equal(success.status, 'SUCCEEDED');
assert.equal(success.rolloutStage, 'COMPLETE');
assert.equal(success.rolloutId, 'rollout-deployment-rollout-1');
assert.equal(success.traceId, job.traceId);

const timedOut = await executor.execute({
  job,
  deploymentId: 'deployment-rollout-2',
  environment: 'production',
  strategy: 'canary',
  timeoutMs: 0,
});

assert.equal(timedOut.status, 'TIMED_OUT');
assert.equal(timedOut.environment, 'production');

console.log('rolloutExecutor tests passed');
