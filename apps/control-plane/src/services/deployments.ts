import { getJson, postJson } from "./api";

export async function getProjectDeployments(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/deployments`);
}

export async function promoteProject(projectId: string, environment: "dev" | "staging" | "prod") {
  return postJson(`/api/projects/${projectId}/deploy/promote`, { environment });
}
