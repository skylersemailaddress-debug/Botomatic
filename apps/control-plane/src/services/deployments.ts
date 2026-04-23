import { getJson, postJson } from "./api";

export async function getProjectDeployments(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/deployments`);
}

export async function getDeploymentHistory(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/deployment-history`);
}

export async function promoteProject(projectId: string, environment: "dev" | "staging" | "prod") {
  return postJson(`/api/projects/${projectId}/deploy/promote`, { environment });
}

export async function rollbackProject(projectId: string, environment: "dev" | "staging" | "prod") {
  return postJson(`/api/projects/${projectId}/deploy/rollback`, { environment });
}
