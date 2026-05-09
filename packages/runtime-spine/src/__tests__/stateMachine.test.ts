import { assert } from 'node:assert/strict';
import { transitionRuntimeJob } from '../stateMachine.js';
import type { RuntimeJob } from '../types.js';

function job(state: RuntimeJob['state']): RuntimeJob {
  return {
    id: 'job-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    buildContractId: 'contract-1',
    state,
    attempt: 0,
    maxAttempts: 3,
    traceId: 'trace-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  };
}

const planned = transitionRuntimeJob(job('REQUESTED'), 'PLANNED');
assert.equal(planned.state, 'PLANNED');
assert.notEqual(planned.updatedAt, job('REQUESTED').updatedAt);

const queued = transitionRuntimeJob(planned, 'QUEUED');
const executing = transitionRuntimeJob(queued, 'EXECUTING');
const validating = transitionRuntimeJob(executing, 'VALIDATING');
const completed = transitionRuntimeJob(validating, 'COMPLETED');
assert.equal(completed.state, 'COMPLETED');

assert.throws(() => transitionRuntimeJob(job('REQUESTED'), 'COMPLETED'));
assert.throws(() => transitionRuntimeJob(job('COMPLETED'), 'EXECUTING'));

const retrying = transitionRuntimeJob(job('FAILED'), 'RETRYING');
assert.equal(retrying.state, 'RETRYING');

console.log('stateMachine tests passed');
