import { assert } from 'node:assert/strict';
import { createRootRuntimeAdapter } from '../rootRuntimeAdapter.js';
import { createDefaultRuntimeFeatureFlags } from '../runtimeFeatureFlags.js';
import type { RuntimeJob } from '../types.js';

const adapter = createRootRuntimeAdapter();

const job: RuntimeJob = {
  id: 'job-root-adapter-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-root-adapter-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await assert.rejects(
  () => adapter.acceptRuntimeJob({
    flags: createDefaultRuntimeFeatureFlags(),
    job,
  }),
  /Runtime feature disabled/,
);

const accepted = await adapter.acceptRuntimeJob({
  flags: {
    ...createDefaultRuntimeFeatureFlags(),
    runtimeSpineEnabled: true,
  },
  job,
});

assert.equal(accepted.accepted, true);
assert.equal(accepted.jobId, job.id);
assert.equal(accepted.traceId, job.traceId);

console.log('rootRuntimeAdapter tests passed');
