import type { RuntimeJob } from './types.js';

export interface RuntimeWorkerLease {
  leaseId: string;
  jobId: string;
  workerId: string;
  traceId: string;
  claimedAt: string;
  expiresAt: string;
}

export function createWorkerLease(params: {
  job: RuntimeJob;
  workerId: string;
  leaseId: string;
  ttlMs: number;
  now?: Date;
}): RuntimeWorkerLease {
  const now = params.now ?? new Date();
  return {
    leaseId: params.leaseId,
    jobId: params.job.id,
    workerId: params.workerId,
    traceId: params.job.traceId,
    claimedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + params.ttlMs).toISOString(),
  };
}

export function isWorkerLeaseExpired(lease: RuntimeWorkerLease, now: Date = new Date()): boolean {
  return new Date(lease.expiresAt).getTime() <= now.getTime();
}
