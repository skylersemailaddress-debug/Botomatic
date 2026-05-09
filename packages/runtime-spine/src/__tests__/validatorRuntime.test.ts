import { assert } from 'node:assert/strict';
import { createRuntimeValidatorEngine } from '../validatorRuntime.js';

const validator = createRuntimeValidatorEngine();

const approved = await validator.validate({
  validatorId: 'validator-pass',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  jobId: 'job-1',
  status: 'APPROVED',
  reasons: [],
  createdAt: new Date().toISOString(),
});

assert.equal(approved.status, 'APPROVED');

const blocked = await validator.validate({
  validatorId: 'validator-block',
  traceId: 'trace-2',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  jobId: 'job-2',
  status: 'BLOCKED',
  reasons: ['missing-proof-artifact'],
  createdAt: new Date().toISOString(),
});

assert.equal(blocked.status, 'BLOCKED');
assert.equal(blocked.reasons[0], 'missing-proof-artifact');

console.log('validatorRuntime tests passed');
