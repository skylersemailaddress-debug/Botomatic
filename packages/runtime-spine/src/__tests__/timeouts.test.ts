import { assert } from 'node:assert/strict';
import { evaluateRuntimeTimeout } from '../timeouts.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-timeout-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-timeout-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const executionTimeout = evaluateRuntimeTimeout({
  job,
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  now: new Date('2026-01-01T00:00:10.000Z'),
  policy: {
    maxExecutionMs: 5000,
    maxHeartbeatSilenceMs: 2000,
  },
});

assert.equal(executionTimeout.timedOut, true);
assert.equal(executionTimeout.reason, 'max-execution-time-exceeded');

const heartbeatTimeout = evaluateRuntimeTimeout({
  job,
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastHeartbeatAt: new Date('2026-01-01T00:00:00.000Z'),
  now: new Date('2026-01-01T00:00:03.000Z'),
  policy: {
    maxExecutionMs: 10000,
    maxHeartbeatSilenceMs: 2000,
  },
});

assert.equal(heartbeatTimeout.timedOut, true);
assert.equal(heartbeatTimeout.reason, 'heartbeat-silence-timeout');

const healthy = evaluateRuntimeTimeout({
  job,
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastHeartbeatAt: new Date('2026-01-01T00:00:01.000Z'),
  now: new Date('2026-01-01T00:00:02.000Z'),
  policy: {
    maxExecutionMs: 10000,
    maxHeartbeatSilenceMs: 5000,
  },
});

assert.equal(healthy.timedOut, false);

console.log('timeouts tests passed');
