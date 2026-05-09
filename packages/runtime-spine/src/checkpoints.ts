import type { RuntimeCheckpoint } from './types.js';

export interface RuntimeCheckpointStore {
  saveCheckpoint(checkpoint: RuntimeCheckpoint): Promise<void>;
  loadCheckpoint(jobId: string): Promise<RuntimeCheckpoint | null>;
  listCheckpoints(jobId: string): Promise<RuntimeCheckpoint[]>;
}

export function createMemoryCheckpointStore(): RuntimeCheckpointStore {
  const checkpoints = new Map<string, RuntimeCheckpoint[]>();

  return {
    async saveCheckpoint(checkpoint) {
      const existing = checkpoints.get(checkpoint.jobId) ?? [];
      existing.push(checkpoint);
      existing.sort((a, b) => a.sequence - b.sequence);
      checkpoints.set(checkpoint.jobId, existing);
    },

    async loadCheckpoint(jobId) {
      const existing = checkpoints.get(jobId) ?? [];
      return existing.at(-1) ?? null;
    },

    async listCheckpoints(jobId) {
      return checkpoints.get(jobId) ?? [];
    },
  };
}
