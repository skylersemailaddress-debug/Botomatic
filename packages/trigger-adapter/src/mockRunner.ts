import { TriggerJobRecord } from "./jobs";

/**
 * Mock runner simulates Trigger.dev behavior.
 * Later this will be replaced with real Trigger.dev integration.
 */
export class MockTriggerRunner {
  private queue: Record<string, TriggerJobRecord> = {};

  enqueue(job: TriggerJobRecord) {
    job.status = "queued";
    this.queue[job.jobId] = job;
    return job;
  }

  async run(jobId: string) {
    const job = this.queue[jobId];
    if (!job) return null;

    job.status = "running";

    // simulate execution delay
    await new Promise((r) => setTimeout(r, 50));

    job.status = "succeeded";
    job.updatedAt = new Date().toISOString();

    return job;
  }

  get(jobId: string) {
    return this.queue[jobId] || null;
  }
}
