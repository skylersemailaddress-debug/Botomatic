import { assert } from 'node:assert/strict';
import { createMemorySandboxExecutor } from '../sandboxExecutor.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-sandbox-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-sandbox-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const executor = createMemorySandboxExecutor();

const success = await executor.execute({
  job,
  sandboxId: 'sandbox-1',
  command: 'npm test',
  timeoutMs: 1000,
  networkPolicy: 'deny-all',
});

assert.equal(success.status, 'SUCCEEDED');
assert.equal(success.jobId, job.id);
assert.equal(success.traceId, job.traceId);

const blocked = await executor.execute({
  job,
  sandboxId: 'sandbox-2',
  command: 'curl https://example.com',
  timeoutMs: 1000,
  networkPolicy: 'allowlist',
  allowedHosts: [],
});

assert.equal(blocked.status, 'BLOCKED');

const timedOut = await executor.execute({
  job,
  sandboxId: 'sandbox-3',
  command: 'npm test',
  timeoutMs: 0,
  networkPolicy: 'deny-all',
});

assert.equal(timedOut.status, 'TIMED_OUT');

console.log('sandboxExecutor tests passed');
