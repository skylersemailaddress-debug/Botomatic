import { getJson, postJson } from "./api";

export type DeploymentEnvironment = "dev" | "staging" | "prod";

export type DeploymentRecord = {
  environment: DeploymentEnvironment;
  status: string;
  promotedAt?: string;
  promotedBy?: string;
  rollbackAt?: string;
  rollbackBy?: string;
};

export type ProjectDeploymentsResponse = {
  deployments: Partial<Record<DeploymentEnvironment, DeploymentRecord>>;
};

export type DeploymentHistoryItem = {
  action: "promote" | "rollback";
  environment: DeploymentEnvironment;
  timestamp: string;
};

export type DeploymentHistoryResponse = {
  history: DeploymentHistoryItem[];
};

export async function getProjectDeployments(projectId: string) {
  return getJson<ProjectDeploymentsResponse>(`/api/projects/${projectId}/ui/deployments`);
}

export async function getDeploymentHistory(projectId: string) {
  const { deployments } = await getProjectDeployments(projectId);
  const history = Object.values(deployments)
    .flatMap((deployment) => {
      if (!deployment) {
        return [];
      }

      const items: DeploymentHistoryItem[] = [];

      if (deployment.promotedAt) {
        items.push({
          action: "promote",
          environment: deployment.environment,
          timestamp: deployment.promotedAt,
        });
      }

      if (deployment.rollbackAt) {
        items.push({
          action: "rollback",
          environment: deployment.environment,
          timestamp: deployment.rollbackAt,
        });
      }

      return items;
    })
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

  return { history } satisfies DeploymentHistoryResponse;
}

export async function promoteProject(projectId: string, environment: DeploymentEnvironment) {
  return postJson(`/api/projects/${projectId}/deploy/promote`, { environment });
}

export async function rollbackProject(projectId: string, environment: DeploymentEnvironment) {
  return postJson(`/api/projects/${projectId}/deploy/rollback`, { environment });
}
