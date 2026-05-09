import { assert } from 'node:assert/strict';
import { createDistributedWorkerCoordinator } from '../distributedWorkers.js';
import type { RuntimeJob } from '../types.js';

const coordinator = createDistributedWorkerCoordinator();

await coordinator.register({
  workerId: 'worker-1',
  registeredAt: new Date().toISOString(),
  capabilities: ['runtime-execution'],
});

const workers = await coordinator.workers();
assert.equal(workers.length, 1);
assert.equal(workers[0]?.workerId, 'worker-1');

const job: RuntimeJob = {
  id: 'job-worker-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-worker-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const lease = await coordinator.assign(job, 'worker-1');
assert.equal(lease.jobId, job.id);
assert.equal(lease.workerId, 'worker-1');

await assert.rejects(
  () => coordinator.assign(job, 'missing-worker'),
  /Worker not registered/,
);

console.log('distributedWorkers tests passed');
