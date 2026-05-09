import type { DeploymentExecutionRequest } from './deploymentExecutor.js';

export interface DeploymentGovernanceDecision {
  allowed: boolean;
  violations: string[];
}

export function evaluateDeploymentGovernance(
  request: DeploymentExecutionRequest,
): DeploymentGovernanceDecision {
  const violations: string[] = [];

  if (request.timeoutMs <= 0) {
    violations.push('deployment-timeout-invalid');
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
