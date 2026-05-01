import { getJsonSafe, postJsonSafe } from "./api";

export async function getLaunchProof(projectId: string) {
  return getJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/launch-proof`);
}

export async function verifyLaunchProof(projectId: string, body: { idempotencyKey: string }) {
  return postJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/launch/verify`, body);
}

export async function requestDeploy(projectId: string, body: { idempotencyKey: string }) {
  return postJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/deploy`, body);
}

export async function getDeployments(projectId: string) {
  return getJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/deployments`);
}

export async function requestRollback(projectId: string, body: { idempotencyKey: string; deploymentId: string }) {
  return postJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/rollback`, body);
}
