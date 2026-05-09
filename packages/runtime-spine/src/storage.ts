import type { RuntimeCheckpoint, RuntimeJob, RuntimeValidatorResult } from './types.js';

export interface RuntimeStorageAdapter {
  saveJob(job: RuntimeJob): Promise<void>;
  loadJob(jobId: string): Promise<RuntimeJob | null>;
  saveCheckpoint(checkpoint: RuntimeCheckpoint): Promise<void>;
  listCheckpoints(jobId: string): Promise<RuntimeCheckpoint[]>;
  saveValidatorResult(result: RuntimeValidatorResult): Promise<void>;
  listValidatorResults(jobId: string): Promise<RuntimeValidatorResult[]>;
}

export function createMemoryRuntimeStorage(): RuntimeStorageAdapter {
  const jobs = new Map<string, RuntimeJob>();
  const checkpoints = new Map<string, RuntimeCheckpoint[]>();
  const validatorResults = new Map<string, RuntimeValidatorResult[]>();

  return {
    async saveJob(job) {
      jobs.set(job.id, job);
    },

    async loadJob(jobId) {
      return jobs.get(jobId) ?? null;
    },

    async saveCheckpoint(checkpoint) {
      const existing = checkpoints.get(checkpoint.jobId) ?? [];
      existing.push(checkpoint);
      existing.sort((a, b) => a.sequence - b.sequence);
      checkpoints.set(checkpoint.jobId, existing);
    },

    async listCheckpoints(jobId) {
      return checkpoints.get(jobId) ?? [];
    },

    async saveValidatorResult(result) {
      const existing = validatorResults.get(result.jobId) ?? [];
      existing.push(result);
      validatorResults.set(result.jobId, existing);
    },

    async listValidatorResults(jobId) {
      return validatorResults.get(jobId) ?? [];
    },
  };
}
