import { assert } from 'node:assert/strict';
import { evaluateDeploymentGovernance } from '../deploymentGovernanceMiddleware.js';
import type { RuntimeJob } from '../types.js';

const job: RuntimeJob = {
  id: 'job-governance-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-governance-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const allowed = evaluateDeploymentGovernance({
  job,
  deploymentId: 'deployment-allowed',
  environment: 'staging',
  strategy: 'rolling',
  timeoutMs: 1000,
});

assert.equal(allowed.allowed, true);
assert.equal(allowed.violations.length, 0);

const blocked = evaluateDeploymentGovernance({
  job,
  deploymentId: 'deployment-blocked',
  environment: 'production',
  strategy: 'canary',
  timeoutMs: 0,
});

assert.equal(blocked.allowed, false);
assert.ok(blocked.violations.includes('deployment-timeout-invalid'));

console.log('deploymentGovernanceMiddleware tests passed');
