import { assert } from 'node:assert/strict';
import { createNoopObservabilityExporter } from '../observabilityExporters.js';
import { createRuntimeMetric } from '../runtimeMetrics.js';

const exporter = createNoopObservabilityExporter();

await exporter.exportMetric(
  createRuntimeMetric({
    name: 'runtime.job.executing',
    traceId: 'trace-1',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    jobId: 'job-1',
    value: 1,
  }),
);

await exporter.exportSpan({
  traceId: 'trace-1',
  spanId: 'span-1',
  parentSpanId: null,
  name: 'runtime.execute',
  startedAt: new Date().toISOString(),
});

await exporter.exportError(new Error('runtime failure'), 'trace-1');

assert.ok(true);

console.log('observabilityExporters tests passed');
