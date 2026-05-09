import type { RuntimeMetricEvent } from './runtimeMetrics.js';
import type { RuntimeTelemetrySpan } from './openTelemetryAdapter.js';

export interface RuntimeObservabilityExporter {
  exportMetric(metric: RuntimeMetricEvent): Promise<void>;
  exportSpan(span: RuntimeTelemetrySpan): Promise<void>;
  exportError(error: Error, traceId: string): Promise<void>;
}

export function createNoopObservabilityExporter(): RuntimeObservabilityExporter {
  return {
    async exportMetric(_metric) {
      return;
    },

    async exportSpan(_span) {
      return;
    },

    async exportError(_error, _traceId) {
      return;
    },
  };
}
