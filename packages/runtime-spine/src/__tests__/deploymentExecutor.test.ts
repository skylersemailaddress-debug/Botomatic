import { assert } from 'node:assert/strict';
import { createMemoryDeploymentExecutor } from '../deploymentExecutor.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-deploy-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-deploy-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const executor = createMemoryDeploymentExecutor();

const success = await executor.execute({
  job,
  deploymentId: 'deployment-1',
  environment: 'staging',
  strategy: 'rolling',
  timeoutMs: 1000,
});

assert.equal(success.status, 'SUCCEEDED');
assert.equal(success.jobId, job.id);
assert.equal(success.traceId, job.traceId);
assert.equal(success.environment, 'staging');

const timedOut = await executor.execute({
  job,
  deploymentId: 'deployment-2',
  environment: 'production',
  strategy: 'canary',
  timeoutMs: 0,
});

assert.equal(timedOut.status, 'TIMED_OUT');
assert.equal(timedOut.environment, 'production');

console.log('deploymentExecutor tests passed');
