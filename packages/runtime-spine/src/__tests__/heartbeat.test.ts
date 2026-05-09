import { assert } from 'node:assert/strict';
import { createHeartbeat, createMemoryHeartbeatStore, isHeartbeatStale } from '../heartbeat.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-heartbeat-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-heartbeat-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

const store = createMemoryHeartbeatStore();

const heartbeat = createHeartbeat(job, {
  workerId: 'worker-1',
  sequence: 1,
  now: new Date('2026-01-01T00:00:00.000Z'),
});

await store.record(heartbeat);

const latest = await store.latest(job.id);
assert.ok(latest);
assert.equal(latest?.jobId, job.id);
assert.equal(latest?.workerId, 'worker-1');
assert.equal(latest?.sequence, 1);

assert.equal(
  isHeartbeatStale(heartbeat, {
    now: new Date('2026-01-01T00:00:00.500Z'),
    staleAfterMs: 1000,
  }),
  false,
);

assert.equal(
  isHeartbeatStale(heartbeat, {
    now: new Date('2026-01-01T00:00:01.000Z'),
    staleAfterMs: 1000,
  }),
  true,
);

console.log('heartbeat tests passed');
