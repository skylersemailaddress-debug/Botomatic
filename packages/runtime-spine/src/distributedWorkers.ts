import type { RuntimeJob } from './types.js';
import { createWorkerLease, type RuntimeWorkerLease } from './workerLease.js';

export interface RuntimeWorkerRegistration {
  workerId: string;
  registeredAt: string;
  capabilities: string[];
}

export interface DistributedWorkerCoordinator {
  register(worker: RuntimeWorkerRegistration): Promise<void>;
  assign(job: RuntimeJob, workerId: string): Promise<RuntimeWorkerLease>;
  workers(): Promise<RuntimeWorkerRegistration[]>;
}

export function createDistributedWorkerCoordinator(): DistributedWorkerCoordinator {
  const registeredWorkers: RuntimeWorkerRegistration[] = [];

  return {
    async register(worker) {
      registeredWorkers.push(worker);
    },

    async assign(job, workerId) {
      const worker = registeredWorkers.find((candidate) => candidate.workerId === workerId);

      if (!worker) {
        throw new Error(`Worker not registered: ${workerId}`);
      }

      return createWorkerLease({
        job,
        workerId,
        leaseId: `lease-${job.id}`,
        ttlMs: 30000,
      });
    },

    async workers() {
      return [...registeredWorkers];
    },
  };
}
