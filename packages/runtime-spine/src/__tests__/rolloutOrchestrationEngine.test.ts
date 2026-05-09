import { assert } from 'node:assert/strict';
import { createMemoryRolloutOrchestrationEngine } from '../rolloutOrchestrationEngine.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-rollout-engine-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'EXECUTING',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-rollout-engine-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const engine = createMemoryRolloutOrchestrationEngine();

const approved = await engine.orchestrate({
  job,
  deploymentId: 'deployment-1',
  environment: 'staging',
  strategy: 'rolling',
  timeoutMs: 1000,
});

assert.equal(approved.status, 'APPROVED');
assert.ok(approved.evaluatedPolicies.includes('proof-validation'));

const blocked = await engine.orchestrate({
  job,
  deploymentId: 'deployment-2',
  environment: 'production',
  strategy: 'canary',
  timeoutMs: 0,
});

assert.equal(blocked.status, 'BLOCKED');

console.log('rolloutOrchestrationEngine tests passed');
