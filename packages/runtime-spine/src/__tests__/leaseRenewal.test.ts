import { assert } from 'node:assert/strict';
import { renewWorkerLease } from '../leaseRenewal.js';
import type { RuntimeWorkerLease } from '../workerLease.js';

const lease: RuntimeWorkerLease = {
  leaseId: 'lease-1',
  jobId: 'job-1',
  workerId: 'worker-1',
  traceId: 'trace-1',
  claimedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  expiresAt: new Date('2026-01-01T00:00:10.000Z').toISOString(),
};

const renewed = renewWorkerLease({
  lease,
  ttlMs: 10000,
  now: new Date('2026-01-01T00:00:05.000Z'),
});

assert.equal(renewed.expiresAt, '2026-01-01T00:00:15.000Z');
assert.equal(renewed.leaseId, lease.leaseId);
assert.equal(renewed.jobId, lease.jobId);

assert.throws(() =>
  renewWorkerLease({
    lease,
    ttlMs: 10000,
    now: new Date('2026-01-01T00:00:10.000Z'),
  }),
);

console.log('leaseRenewal tests passed');
