import { assert } from 'node:assert/strict';
import { createMemoryRuntimeQueue } from '../queue.js';
import { createRuntimeScheduler } from '../scheduler.js';
import type { RuntimeJob } from '../types.js';

const queue = createMemoryRuntimeQueue();
const scheduler = createRuntimeScheduler(queue);

const queuedJob: RuntimeJob = {
  id: 'job-scheduler-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-scheduler-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await scheduler.schedule(queuedJob);
assert.equal(await queue.size(), 1);

const next = await scheduler.next();
assert.ok(next);
assert.equal(next?.id, queuedJob.id);
assert.equal(await queue.size(), 0);

await assert.rejects(
  () => scheduler.schedule({
    ...queuedJob,
    id: 'job-scheduler-invalid',
    state: 'REQUESTED',
  }),
  /can only schedule QUEUED jobs/,
);

console.log('scheduler tests passed');
