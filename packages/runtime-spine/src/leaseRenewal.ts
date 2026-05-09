import type { RuntimeWorkerLease } from './workerLease.js';

export function renewWorkerLease(params: {
  lease: RuntimeWorkerLease;
  ttlMs: number;
  now?: Date;
}): RuntimeWorkerLease {
  const now = params.now ?? new Date();

  if (new Date(params.lease.expiresAt).getTime() <= now.getTime()) {
    throw new Error(`Cannot renew expired lease: ${params.lease.leaseId}`);
  }

  return {
    ...params.lease,
    expiresAt: new Date(now.getTime() + params.ttlMs).toISOString(),
  };
}
