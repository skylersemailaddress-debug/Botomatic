import { TriggerJobRecord } from "./jobs";

export class InMemoryJobRepository {
  private jobs: Record<string, TriggerJobRecord & { retryCount?: number }> = {};

  save(job: TriggerJobRecord) {
    this.jobs[job.jobId] = { ...job, retryCount: 0 };
  }

  get(jobId: string) {
    return this.jobs[jobId] || null;
  }

  update(jobId: string, updates: Partial<TriggerJobRecord & { retryCount?: number }>) {
    if (!this.jobs[jobId]) return;
    this.jobs[jobId] = {
      ...this.jobs[jobId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }

  incrementRetry(jobId: string) {
    if (!this.jobs[jobId]) return;
    this.jobs[jobId].retryCount = (this.jobs[jobId].retryCount || 0) + 1;
  }
}
