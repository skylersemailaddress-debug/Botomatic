import { assert } from 'node:assert/strict';
import { createMemoryCheckpointStore } from '../checkpoints.js';

const store = createMemoryCheckpointStore();

await store.saveCheckpoint({
  id: 'checkpoint-1',
  jobId: 'job-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  traceId: 'trace-1',
  state: 'CHECKPOINTED',
  sequence: 1,
  data: { step: 'generated-source' },
  createdAt: new Date().toISOString(),
});

const loaded = await store.loadCheckpoint('job-1');
assert.ok(loaded);
assert.equal(loaded?.id, 'checkpoint-1');
assert.equal(loaded?.state, 'CHECKPOINTED');
assert.equal(loaded?.data.step, 'generated-source');

await store.saveCheckpoint({
  id: 'checkpoint-2',
  jobId: 'job-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  traceId: 'trace-1',
  state: 'VALIDATING',
  sequence: 2,
  data: { step: 'validator-replay' },
  createdAt: new Date().toISOString(),
});

const latest = await store.loadCheckpoint('job-1');
assert.equal(latest?.id, 'checkpoint-2');
assert.equal(latest?.sequence, 2);

const list = await store.listCheckpoints('job-1');
assert.equal(list.length, 2);

console.log('checkpoints tests passed');
