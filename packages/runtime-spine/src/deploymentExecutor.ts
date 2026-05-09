import type { RuntimeJob } from './types.js';

export interface DeploymentExecutionRequest {
  job: RuntimeJob;
  deploymentId: string;
  environment: 'development' | 'staging' | 'production';
  strategy: 'rolling' | 'blue-green' | 'canary';
  timeoutMs: number;
}

export interface DeploymentExecutionResult {
  deploymentId: string;
  jobId: string;
  traceId: string;
  environment: string;
  strategy: string;
  status: 'SUCCEEDED' | 'FAILED' | 'ROLLED_BACK' | 'TIMED_OUT';
  completedAt: string;
}

export interface DeploymentExecutor {
  execute(request: DeploymentExecutionRequest): Promise<DeploymentExecutionResult>;
}

export function createMemoryDeploymentExecutor(): DeploymentExecutor {
  return {
    async execute(request) {
      if (request.timeoutMs <= 0) {
        return {
          deploymentId: request.deploymentId,
          jobId: request.job.id,
          traceId: request.job.traceId,
          environment: request.environment,
          strategy: request.strategy,
          status: 'TIMED_OUT',
          completedAt: new Date().toISOString(),
        };
      }

      return {
        deploymentId: request.deploymentId,
        jobId: request.job.id,
        traceId: request.job.traceId,
        environment: request.environment,
        strategy: request.strategy,
        status: 'SUCCEEDED',
        completedAt: new Date().toISOString(),
      };
    },
  };
}
