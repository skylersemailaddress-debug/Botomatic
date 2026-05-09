import { createMemoryCheckpointStore } from './checkpoints.js';
import { createRuntimeCoordinator } from './orchestrationCoordinator.js';
import { createMemoryRuntimeQueue } from './queue.js';
import { createRuntimeScheduler } from './scheduler.js';
import { createMemoryRuntimeStorage } from './storage.js';
import { createRuntimeValidatorEngine } from './validatorRuntime.js';
import type { RuntimeJob } from './types.js';

async function main() {
  const queue = createMemoryRuntimeQueue();
  const checkpoints = createMemoryCheckpointStore();
  const validators = createRuntimeValidatorEngine();
  const scheduler = createRuntimeScheduler(queue);
  const storage = createMemoryRuntimeStorage();

  const coordinator = createRuntimeCoordinator({
    queue,
    checkpoints,
    validators,
  });

  const job: RuntimeJob = {
    id: 'proof-job-1',
    tenantId: 'tenant-proof',
    projectId: 'project-proof',
    buildContractId: 'contract-proof',
    state: 'QUEUED',
    attempt: 0,
    maxAttempts: 3,
    traceId: 'trace-proof-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveJob(job);
  await scheduler.schedule(job);

  const executing = await coordinator.processNext('worker-proof-1');

  if (!executing) {
    throw new Error('Expected executing job during runtime proof');
  }

  const approved = await validators.approve({
    validatorId: 'validator-proof-1',
    traceId: executing.traceId,
    tenantId: executing.tenantId,
    projectId: executing.projectId,
    jobId: executing.id,
  });

  await storage.saveValidatorResult(approved);

  const persisted = await storage.loadJob(job.id);

  console.log(
    JSON.stringify(
      {
        runtime: 'runtime-spine',
        status: 'PASS',
        jobId: executing.id,
        validatorStatus: approved.status,
        persisted: Boolean(persisted),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
