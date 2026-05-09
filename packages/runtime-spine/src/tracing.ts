import type { RuntimeTraceContext } from './types.js';

function createSpanId(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function createTraceContext(params: {
  traceId: string;
  tenantId: string;
  projectId: string;
  jobId?: string;
  validatorRunId?: string;
  spanName?: string;
}): RuntimeTraceContext {
  return {
    traceId: params.traceId,
    spanId: createSpanId(),
    parentSpanId: null,
    spanName: params.spanName ?? 'runtime-root',
    tenantId: params.tenantId,
    projectId: params.projectId,
    jobId: params.jobId,
    validatorRunId: params.validatorRunId,
    createdAt: new Date().toISOString(),
  };
}

export function createChildTraceContext(parent: RuntimeTraceContext, params: {
  spanName: string;
  validatorRunId?: string;
}): RuntimeTraceContext {
  return {
    traceId: parent.traceId,
    spanId: createSpanId(),
    parentSpanId: parent.spanId,
    spanName: params.spanName,
    tenantId: parent.tenantId,
    projectId: parent.projectId,
    jobId: parent.jobId,
    validatorRunId: params.validatorRunId,
    createdAt: new Date().toISOString(),
  };
}
