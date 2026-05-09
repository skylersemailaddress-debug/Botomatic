import type { RuntimeTraceContext } from './types.js';

export interface RuntimeTelemetrySpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startedAt: string;
  endedAt?: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface RuntimeTelemetryAdapter {
  startSpan(context: RuntimeTraceContext, name: string): Promise<RuntimeTelemetrySpan>;
  endSpan(span: RuntimeTelemetrySpan): Promise<RuntimeTelemetrySpan>;
  listSpans(): Promise<RuntimeTelemetrySpan[]>;
}

export function createMemoryTelemetryAdapter(): RuntimeTelemetryAdapter {
  const spans: RuntimeTelemetrySpan[] = [];

  return {
    async startSpan(context, name) {
      const span: RuntimeTelemetrySpan = {
        traceId: context.traceId,
        spanId: context.spanId,
        parentSpanId: context.parentSpanId,
        name,
        startedAt: new Date().toISOString(),
      };

      spans.push(span);

      return span;
    },

    async endSpan(span) {
      span.endedAt = new Date().toISOString();
      return span;
    },

    async listSpans() {
      return [...spans];
    },
  };
}
