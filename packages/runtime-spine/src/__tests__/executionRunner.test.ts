import { assert } from 'node:assert/strict';
import { createMemoryCheckpointStore } from '../checkpoints.js';
import { createExecutionRunner } from '../executionRunner.js';
import { createMemoryTelemetryAdapter } from '../openTelemetryAdapter.js';
import { createMemoryRuntimeQueue } from '../queue.js';
import { createMemoryRuntimeMetricsSink } from '../runtimeMetrics.js';
import { createRuntimeValidatorEngine } from '../validatorRuntime.js';
import type { RuntimeJob } from '../types.js';

const queue = createMemoryRuntimeQueue();
const checkpoints = createMemoryCheckpointStore();
const validators = createRuntimeValidatorEngine();
const metrics = createMemoryRuntimeMetricsSink();
const telemetry = createMemoryTelemetryAdapter();

const runner = createExecutionRunner({
  queue,
  checkpoints,
  validators,
  metrics,
  telemetry,
});

const job: RuntimeJob = {
  id: 'job-runner-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  buildContractId: 'contract-1',
  state: 'QUEUED',
  attempt: 0,
  maxAttempts: 3,
  traceId: 'trace-runner-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const result = await runner.run(job, 'worker-runner-1');
assert.equal(result.executing.state, 'EXECUTING');
assert.equal(result.validatorResult.status, 'APPROVED');

const metricEvents = await metrics.list();
assert.equal(metricEvents.length, 2);
assert.equal(metricEvents[0]?.name, 'runtime.job.executing');
assert.equal(metricEvents[1]?.name, 'runtime.validator.approved');

const spans = await telemetry.listSpans();
assert.equal(spans.length, 1);
assert.equal(spans[0]?.traceId, job.traceId);
assert.equal(spans[0]?.name, 'runtime.execute');
assert.ok(spans[0]?.endedAt);

const checkpoint = await checkpoints.loadCheckpoint(job.id);
assert.ok(checkpoint);
assert.equal(checkpoint?.state, 'EXECUTING');

console.log('executionRunner tests passed');
