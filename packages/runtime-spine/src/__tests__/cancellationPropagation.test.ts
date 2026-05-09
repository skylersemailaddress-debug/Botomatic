import { assert } from 'node:assert/strict';
import { createCancellationRequest, createMemoryCancellationStore } from '../cancellation.js';
import { createCancellationPropagation } from '../cancellationPropagation.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-cancel-prop-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-cancel-prop-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const store = createMemoryCancellationStore();
const propagation = createCancellationPropagation(store);

const before = await propagation.evaluate(job);
assert.equal(before.cancelled, false);

await store.request(createCancellationRequest(job, 'operator-requested-cancel'));

const after = await propagation.evaluate(job);
assert.equal(after.cancelled, true);
assert.equal(after.reason, 'operator-requested-cancel');
assert.equal(after.jobId, job.id);
assert.equal(after.traceId, job.traceId);

console.log('cancellationPropagation tests passed');
