import { assert } from 'node:assert/strict';
import { createCancellationRequest, createMemoryCancellationStore } from '../cancellation.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-cancel-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-cancel-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const store = createMemoryCancellationStore();

const request = createCancellationRequest(job, 'operator-requested-cancel');

await store.request(request);

const persisted = await store.get(job.id);

assert.ok(persisted);
assert.equal(persisted?.jobId, job.id);
assert.equal(persisted?.reason, 'operator-requested-cancel');
assert.equal(persisted?.traceId, job.traceId);

console.log('cancellation tests passed');
