import { assert } from 'node:assert/strict';
import { enforceRuntimeActivation } from '../runtimeEnforcementMiddleware.js';

const allowed = enforceRuntimeActivation({
  ciProofPassed: true,
  migrationsValidated: true,
  observabilityOperational: true,
  dashboardsOperational: true,
  alertsOperational: true,
  rollbackValidated: true,
});

assert.equal(allowed.allowed, true);
assert.deepEqual(allowed.violations, []);

const blocked = enforceRuntimeActivation({
  ciProofPassed: true,
  migrationsValidated: false,
  observabilityOperational: true,
  dashboardsOperational: false,
  alertsOperational: true,
  rollbackValidated: false,
});

assert.equal(blocked.allowed, false);
assert.deepEqual(blocked.violations, [
  'migrationsValidated',
  'dashboardsOperational',
  'rollbackValidated',
]);

console.log('runtimeEnforcementMiddleware tests passed');
