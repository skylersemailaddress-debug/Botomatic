import { assert } from 'node:assert/strict';
import { evaluateRuntimeActivationChecklist } from '../runtimeActivationChecklist.js';

const approved = evaluateRuntimeActivationChecklist({
  ciProofPassed: true,
  migrationsValidated: true,
  observabilityOperational: true,
  dashboardsOperational: true,
  alertsOperational: true,
  rollbackValidated: true,
});

assert.equal(approved.approved, true);
assert.equal(approved.failedChecks.length, 0);

const rejected = evaluateRuntimeActivationChecklist({
  ciProofPassed: false,
  migrationsValidated: true,
  observabilityOperational: false,
  dashboardsOperational: true,
  alertsOperational: false,
  rollbackValidated: true,
});

assert.equal(rejected.approved, false);
assert.deepEqual(rejected.failedChecks, [
  'ciProofPassed',
  'observabilityOperational',
  'alertsOperational',
]);

console.log('runtimeActivationChecklist tests passed');
