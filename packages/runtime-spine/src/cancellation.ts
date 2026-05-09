import type { RuntimeJob } from './types.js';

export interface RuntimeCancellationRequest {
  jobId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  reason: string;
  requestedAt: string;
}

export interface RuntimeCancellationStore {
  request(request: RuntimeCancellationRequest): Promise<void>;
  get(jobId: string): Promise<RuntimeCancellationRequest | null>;
}

export function createCancellationRequest(job: RuntimeJob, reason: string): RuntimeCancellationRequest {
  return {
    jobId: job.id,
    traceId: job.traceId,
    tenantId: job.tenantId,
    projectId: job.projectId,
    reason,
    requestedAt: new Date().toISOString(),
  };
}

export function createMemoryCancellationStore(): RuntimeCancellationStore {
  const cancellations = new Map<string, RuntimeCancellationRequest>();

  return {
    async request(request) {
      cancellations.set(request.jobId, request);
    },

    async get(jobId) {
      return cancellations.get(jobId) ?? null;
    },
  };
}
