import type { RuntimeTelemetrySpan } from './openTelemetryAdapter.js';
import type { RuntimeMetricEvent } from './runtimeMetrics.js';

export interface OpenTelemetryExporter {
  exportSpan(span: RuntimeTelemetrySpan): Promise<void>;
  exportMetric(metric: RuntimeMetricEvent): Promise<void>;
}

export function createNoopOpenTelemetryExporter(): OpenTelemetryExporter {
  return {
    async exportSpan(_span) {
      return;
    },

    async exportMetric(_metric) {
      return;
    },
  };
}
