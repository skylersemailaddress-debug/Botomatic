import type { DeploymentExecutionRequest, DeploymentExecutionResult } from './deploymentExecutor.js';

export interface RolloutExecutionResult extends DeploymentExecutionResult {
  rolloutId: string;
  rolloutStage: 'PREPARE' | 'DEPLOY' | 'VERIFY' | 'COMPLETE' | 'ROLLBACK';
}

export interface RolloutExecutor {
  execute(request: DeploymentExecutionRequest): Promise<RolloutExecutionResult>;
}

export function createMemoryRolloutExecutor(): RolloutExecutor {
  return {
    async execute(request) {
      return {
        rolloutId: `rollout-${request.deploymentId}`,
        rolloutStage: 'COMPLETE',
        deploymentId: request.deploymentId,
        jobId: request.job.id,
        traceId: request.job.traceId,
        environment: request.environment,
        strategy: request.strategy,
        status: request.timeoutMs <= 0 ? 'TIMED_OUT' : 'SUCCEEDED',
        completedAt: new Date().toISOString(),
      };
    },
  };
}
