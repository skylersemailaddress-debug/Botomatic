export interface RuntimeMetricEvent {
  name: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  jobId?: string;
  value: number;
  createdAt: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface RuntimeMetricsSink {
  emit(event: RuntimeMetricEvent): Promise<void>;
  list(): Promise<RuntimeMetricEvent[]>;
}

export function createMemoryRuntimeMetricsSink(): RuntimeMetricsSink {
  const events: RuntimeMetricEvent[] = [];

  return {
    async emit(event) {
      events.push(event);
    },

    async list() {
      return [...events];
    },
  };
}

export function createRuntimeMetric(params: Omit<RuntimeMetricEvent, 'createdAt'>): RuntimeMetricEvent {
  return {
    ...params,
    createdAt: new Date().toISOString(),
  };
}
