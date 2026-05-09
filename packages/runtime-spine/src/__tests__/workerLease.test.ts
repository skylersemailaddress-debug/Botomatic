import { assert } from 'node:assert/strict';
import { createWorkerLease, isWorkerLeaseExpired } from '../workerLease.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-lease-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-lease-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

const now = new Date('2026-01-01T00:00:00.000Z');
const lease = createWorkerLease({
  job,
  workerId: 'worker-1',
  leaseId: 'lease-1',
  ttlMs: 1000,
  now,
});

assert.equal(lease.jobId, job.id);
assert.equal(lease.traceId, job.traceId);
assert.equal(lease.workerId, 'worker-1');
assert.equal(isWorkerLeaseExpired(lease, new Date('2026-01-01T00:00:00.500Z')), false);
assert.equal(isWorkerLeaseExpired(lease, new Date('2026-01-01T00:00:01.000Z')), true);

console.log('workerLease tests passed');
