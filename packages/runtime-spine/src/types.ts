export type RuntimeExecutionState =
  | 'REQUESTED'
  | 'PLANNED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'CHECKPOINTED'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'RETRYING'
  | 'BLOCKED'
  | 'FAILED'
  | 'DEAD_LETTER';

export interface RuntimeTraceContext {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  spanName: string;
  tenantId: string;
  projectId: string;
  jobId?: string;
  validatorRunId?: string;
  createdAt: string;
}

export interface RuntimeJob {
  id: string;
  tenantId: string;
  projectId: string;
  buildContractId: string;
  state: RuntimeExecutionState;
  attempt: number;
  maxAttempts: number;
  traceId: string;
  createdAt: string;
  updatedAt: string;
  blockedReason?: string;
  failedReason?: string;
}

export interface RuntimeCheckpoint {
  id: string;
  jobId: string;
  tenantId: string;
  projectId: string;
  traceId: string;
  state: RuntimeExecutionState;
  sequence: number;
  data: Record<string, unknown>;
  createdAt: string;
}

export type RuntimeValidatorStatus = 'APPROVED' | 'BLOCKED';

export interface RuntimeValidatorResult {
  validatorId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  jobId: string;
  status: RuntimeValidatorStatus;
  reasons: string[];
  createdAt: string;
}
