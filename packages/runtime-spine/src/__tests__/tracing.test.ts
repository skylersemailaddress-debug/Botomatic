import { assert } from 'node:assert/strict';
import { createTraceContext, createChildTraceContext } from '../tracing.js';

const root = createTraceContext({
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  jobId: 'job-1',
});

assert.equal(root.traceId, 'trace-1');
assert.equal(root.parentSpanId, null);

const child = createChildTraceContext(root, {
  spanName: 'validator-runtime',
});

assert.equal(child.traceId, root.traceId);
assert.equal(child.parentSpanId, root.spanId);
assert.equal(child.jobId, root.jobId);

console.log('tracing tests passed');
