import { createRuntimeMetric, type RuntimeMetricsSink } from './runtimeMetrics.js';
import type { RuntimeCoordinatorDependencies } from './orchestrationCoordinator.js';
import { createRuntimeCoordinator } from './orchestrationCoordinator.js';
import type { RuntimeTelemetryAdapter } from './openTelemetryAdapter.js';
import { createTraceContext } from './tracing.js';
import type { RuntimeJob } from './types.js';

export interface RuntimeExecutionRunnerDependencies extends RuntimeCoordinatorDependencies {
  metrics: RuntimeMetricsSink;
  telemetry: RuntimeTelemetryAdapter;
}

export function createExecutionRunner(deps: RuntimeExecutionRunnerDependencies) {
  const coordinator = createRuntimeCoordinator(deps);

  return {
    async run(job: RuntimeJob, workerId: string) {
      const trace = createTraceContext({
        traceId: job.traceId,
        tenantId: job.tenantId,
        projectId: job.projectId,
        jobId: job.id,
        spanName: 'runtime-execution-runner',
      });

      const span = await deps.telemetry.startSpan(trace, 'runtime.execute');

      await coordinator.enqueue(job);

      const executing = await coordinator.processNext(workerId);

      if (!executing) {
        throw new Error('Runtime execution runner failed to claim job');
      }

      await deps.metrics.emit(
        createRuntimeMetric({
          name: 'runtime.job.executing',
          traceId: executing.traceId,
          tenantId: executing.tenantId,
          projectId: executing.projectId,
          jobId: executing.id,
          value: 1,
        }),
      );

      const validatorResult = await deps.validators.approve({
        validatorId: 'runtime-execution-runner',
        traceId: executing.traceId,
        tenantId: executing.tenantId,
        projectId: executing.projectId,
        jobId: executing.id,
      });

      await deps.metrics.emit(
        createRuntimeMetric({
          name: 'runtime.validator.approved',
          traceId: validatorResult.traceId,
          tenantId: validatorResult.tenantId,
          projectId: validatorResult.projectId,
          jobId: validatorResult.jobId,
          value: 1,
        }),
      );

      await deps.telemetry.endSpan(span);

      return {
        executing,
        validatorResult,
      };
    },
  };
}
