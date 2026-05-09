import { assert } from 'node:assert/strict';
import { createMemoryRuntimeQueue } from '../queue.js';

const queue = createMemoryRuntimeQueue();

await queue.enqueue({
  id: 'job-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const claimed = await queue.claim();
assert.ok(claimed);
assert.equal(claimed?.id, 'job-1');

await queue.acknowledge(claimed!.id);

const next = await queue.claim();
assert.equal(next, null);

console.log('queue tests passed');
