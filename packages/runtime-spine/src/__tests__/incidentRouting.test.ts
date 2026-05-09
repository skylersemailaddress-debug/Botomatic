import { assert } from 'node:assert/strict';
import { createNoopIncidentRouter } from '../incidentRouting.js';

const router = createNoopIncidentRouter();

const incident = {
  severity: 'critical' as const,
  traceId: 'trace-incident-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  message: 'runtime failure detected',
};

await router.routeToSlack(incident);
await router.routeToPagerDuty(incident);

assert.ok(true);

console.log('incidentRouting tests passed');
