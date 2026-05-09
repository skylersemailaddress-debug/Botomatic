import type { DeploymentExecutionRequest } from './deploymentExecutor.js';

export interface RolloutOrchestrationResult {
  rolloutId: string;
  status: 'APPROVED' | 'BLOCKED' | 'ROLLED_BACK';
  evaluatedPolicies: string[];
}

export interface RolloutOrchestrationEngine {
  orchestrate(request: DeploymentExecutionRequest): Promise<RolloutOrchestrationResult>;
}

export function createMemoryRolloutOrchestrationEngine(): RolloutOrchestrationEngine {
  return {
    async orchestrate(request) {
      return {
        rolloutId: `rollout-${request.deploymentId}`,
        status: request.timeoutMs <= 0 ? 'BLOCKED' : 'APPROVED',
        evaluatedPolicies: [
          'proof-validation',
          'rollback-readiness',
          'freeze-governance',
        ],
      };
    },
  };
}
