import { redactSensitive } from "./security/commercialHardening";

export type LogOutcome = "success" | "error" | "rejected";
export type ErrorCategory = "validation" | "auth" | "provider" | "internal";

export type StructuredLogEvent = {
  event: string;
  requestId: string | null;
  actorId: string | null;
  tenantId: string | null;
  projectId: string | null;
  buildRunId: string | null;
  jobId: string | null;
  route: string | null;
  latency: number | null;
  outcome: LogOutcome;
  errorCategory: ErrorCategory | null;
  method?: string | null;
  statusCode?: number | null;
  timestamp: string;
  [key: string]: unknown;
};

type MetricType = "counter" | "gauge" | "histogram";

type MetricDefinition = {
  name: string;
  type: MetricType;
  labelNames: string[];
};

type MetricSeries = {
  labels: Record<string, string>;
  value: number;
};

type HistogramSeries = {
  labels: Record<string, string>;
  count: number;
  sum: number;
  max: number;
};

export const REQUIRED_METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  { name: "botomatic_request_total", type: "counter", labelNames: ["route", "method", "outcome"] },
  { name: "botomatic_error_rate", type: "gauge", labelNames: [] },
  { name: "botomatic_queue_depth", type: "gauge", labelNames: [] },
  { name: "botomatic_worker_count", type: "gauge", labelNames: [] },
  { name: "botomatic_job_success_total", type: "counter", labelNames: [] },
  { name: "botomatic_job_failure_total", type: "counter", labelNames: [] },
  { name: "botomatic_idempotency_hits_total", type: "counter", labelNames: [] },
  { name: "botomatic_duplicate_enqueue_prevented_total", type: "counter", labelNames: [] },
  { name: "botomatic_repair_attempts_total", type: "counter", labelNames: [] },
  { name: "botomatic_repair_exhausted_total", type: "counter", labelNames: [] },
  { name: "botomatic_readiness_locked_total", type: "counter", labelNames: [] },
  { name: "botomatic_readiness_unlocked_total", type: "counter", labelNames: [] },
  { name: "botomatic_provider_latency_ms", type: "histogram", labelNames: ["provider"] },
  { name: "botomatic_provider_errors_total", type: "counter", labelNames: ["provider", "errorCategory"] },
  { name: "botomatic_upload_failures_total", type: "counter", labelNames: [] },
] as const;

const metricDefinitions = new Map(REQUIRED_METRIC_DEFINITIONS.map((definition) => [definition.name, definition]));
const counterSeries = new Map<string, Map<string, MetricSeries>>();
const gaugeSeries = new Map<string, Map<string, MetricSeries>>();
const histogramSeries = new Map<string, Map<string, HistogramSeries>>();
const recentStructuredLogs: StructuredLogEvent[] = [];

function normalizeLabels(input: Record<string, unknown>, labelNames: string[]): Record<string, string> {
  return labelNames.reduce<Record<string, string>>((acc, labelName) => {
    acc[labelName] = String(input[labelName] ?? "");
    return acc;
  }, {});
}

function labelKey(labels: Record<string, string>, labelNames: string[]): string {
  return labelNames.map((name) => `${name}=${labels[name] || ""}`).join("|");
}

function getOrCreateSeriesMap(name: string, type: MetricType) {
  if (type === "counter") {
    let target = counterSeries.get(name);
    if (!target) {
      target = new Map();
      counterSeries.set(name, target);
    }
    return target;
  }
  if (type === "gauge") {
    let target = gaugeSeries.get(name);
    if (!target) {
      target = new Map();
      gaugeSeries.set(name, target);
    }
    return target;
  }
  let target = histogramSeries.get(name);
  if (!target) {
    target = new Map();
    histogramSeries.set(name, target);
  }
  return target;
}

export function listRegisteredMetricNames(): string[] {
  return [...metricDefinitions.keys()];
}

export function incrementMetric(name: string, labels: Record<string, unknown> = {}, amount = 1) {
  const definition = metricDefinitions.get(name);
  if (!definition || definition.type !== "counter") return;
  const normalized = normalizeLabels(labels, definition.labelNames);
  const key = labelKey(normalized, definition.labelNames);
  const series = getOrCreateSeriesMap(name, "counter") as Map<string, MetricSeries>;
  const current = series.get(key);
  series.set(key, { labels: normalized, value: (current?.value || 0) + amount });
}

export function setMetric(name: string, value: number, labels: Record<string, unknown> = {}) {
  const definition = metricDefinitions.get(name);
  if (!definition || definition.type !== "gauge") return;
  const normalized = normalizeLabels(labels, definition.labelNames);
  const key = labelKey(normalized, definition.labelNames);
  const series = getOrCreateSeriesMap(name, "gauge") as Map<string, MetricSeries>;
  series.set(key, { labels: normalized, value });
}

export function observeMetric(name: string, value: number, labels: Record<string, unknown> = {}) {
  const definition = metricDefinitions.get(name);
  if (!definition || definition.type !== "histogram") return;
  const normalized = normalizeLabels(labels, definition.labelNames);
  const key = labelKey(normalized, definition.labelNames);
  const series = getOrCreateSeriesMap(name, "histogram") as Map<string, HistogramSeries>;
  const current = series.get(key);
  series.set(key, {
    labels: normalized,
    count: (current?.count || 0) + 1,
    sum: (current?.sum || 0) + value,
    max: Math.max(current?.max || 0, value),
  });
}

export function exportMetricsJson() {
  const metrics: Record<string, unknown> = {};
  for (const definition of REQUIRED_METRIC_DEFINITIONS) {
    if (definition.type === "histogram") {
      metrics[definition.name] = [...(histogramSeries.get(definition.name)?.values() || [])];
      continue;
    }
    const source = definition.type === "counter" ? counterSeries.get(definition.name) : gaugeSeries.get(definition.name);
    const values = [...(source?.values() || [])];
    metrics[definition.name] = definition.labelNames.length === 0 ? (values[0]?.value || 0) : values;
  }
  return {
    format: "json",
    metrics,
    registeredMetricNames: listRegisteredMetricNames(),
  };
}

export function exportMetricsText(): string {
  const lines: string[] = [];
  for (const definition of REQUIRED_METRIC_DEFINITIONS) {
    lines.push(`# TYPE ${definition.name} ${definition.type === "histogram" ? "summary" : definition.type}`);
    if (definition.type === "histogram") {
      for (const series of histogramSeries.get(definition.name)?.values() || []) {
        const labelText = definition.labelNames.length > 0
          ? `{${definition.labelNames.map((name) => `${name}="${series.labels[name] || ""}"`).join(",")}}`
          : "";
        lines.push(`${definition.name}_count${labelText} ${series.count}`);
        lines.push(`${definition.name}_sum${labelText} ${series.sum}`);
        lines.push(`${definition.name}_max${labelText} ${series.max}`);
      }
      continue;
    }
    const source = definition.type === "counter" ? counterSeries.get(definition.name) : gaugeSeries.get(definition.name);
    for (const series of source?.values() || []) {
      const labelText = definition.labelNames.length > 0
        ? `{${definition.labelNames.map((name) => `${name}="${series.labels[name] || ""}"`).join(",")}}`
        : "";
      lines.push(`${definition.name}${labelText} ${series.value}`);
    }
  }
  return lines.join("\n");
}

export function emitStructuredLog(event: Omit<StructuredLogEvent, "timestamp"> & { timestamp?: string }) {
  const normalized: StructuredLogEvent = {
    event: String(event.event),
    requestId: null,
    actorId: null,
    tenantId: null,
    projectId: null,
    buildRunId: null,
    jobId: null,
    route: null,
    latency: null,
    errorCategory: null,
    method: null,
    statusCode: null,
    outcome: event.outcome as LogOutcome,
    timestamp: event.timestamp || new Date().toISOString(),
    ...event,
  };
  recentStructuredLogs.unshift(normalized);
  if (recentStructuredLogs.length > 500) {
    recentStructuredLogs.length = 500;
  }
  console.log(JSON.stringify(redactSensitive(normalized)));
}

export function getRecentStructuredLogs(limit = 200): StructuredLogEvent[] {
  return recentStructuredLogs.slice(0, limit);
}

export function resetObservabilityStateForTests() {
  recentStructuredLogs.length = 0;
  counterSeries.clear();
  gaugeSeries.clear();
  histogramSeries.clear();
}
