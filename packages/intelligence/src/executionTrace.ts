export type ModelExecutionTrace = {
  traceId: string;
  capability: "extract" | "plan" | "code" | "review" | "validate";
  selectedModelId: string;
  attemptedModelIds: string[];
  success: boolean;
  confidence?: number;
  createdAt: string;
};

const traces: ModelExecutionTrace[] = [];

export function recordModelExecutionTrace(input: Omit<ModelExecutionTrace, "traceId" | "createdAt">): ModelExecutionTrace {
  const trace: ModelExecutionTrace = {
    traceId: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  traces.push(trace);
  return trace;
}

export function listModelExecutionTraces(): ModelExecutionTrace[] {
  return traces;
}
