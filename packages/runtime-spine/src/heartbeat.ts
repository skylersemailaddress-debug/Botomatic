import type { RuntimeJob } from './types.js';

export interface RuntimeHeartbeat {
  jobId: string;
  workerId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  sequence: number;
  createdAt: string;
}

export interface RuntimeHeartbeatStore {
  record(heartbeat: RuntimeHeartbeat): Promise<void>;
  latest(jobId: string): Promise<RuntimeHeartbeat | null>;
  list(jobId: string): Promise<RuntimeHeartbeat[]>;
}

export function createHeartbeat(job: RuntimeJob, params: { workerId: string; sequence: number; now?: Date }): RuntimeHeartbeat {
  return {
    jobId: job.id,
    workerId: params.workerId,
    traceId: job.traceId,
    tenantId: job.tenantId,
    projectId: job.projectId,
    sequence: params.sequence,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
}

export function createMemoryHeartbeatStore(): RuntimeHeartbeatStore {
  const heartbeats = new Map<string, RuntimeHeartbeat[]>();

  return {
    async record(heartbeat) {
      const existing = heartbeats.get(heartbeat.jobId) ?? [];
      existing.push(heartbeat);
      existing.sort((a, b) => a.sequence - b.sequence);
      heartbeats.set(heartbeat.jobId, existing);
    },

    async latest(jobId) {
      const existing = heartbeats.get(jobId) ?? [];
      return existing.at(-1) ?? null;
    },

    async list(jobId) {
      return heartbeats.get(jobId) ?? [];
    },
  };
}

export function isHeartbeatStale(heartbeat: RuntimeHeartbeat, params: { now?: Date; staleAfterMs: number }): boolean {
  const now = params.now ?? new Date();
  return now.getTime() - new Date(heartbeat.createdAt).getTime() >= params.staleAfterMs;
}
