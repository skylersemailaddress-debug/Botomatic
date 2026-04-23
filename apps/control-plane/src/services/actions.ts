import { postJson } from "./api";

export async function compileProject(projectId: string) {
  return postJson(`/api/projects/${projectId}/compile`);
}

export async function planProject(projectId: string) {
  return postJson(`/api/projects/${projectId}/plan`);
}

export async function executeNext(projectId: string) {
  return postJson(`/api/projects/${projectId}/dispatch/execute-next`);
}

export async function replayRepair(projectId: string) {
  return postJson(`/api/projects/${projectId}/repair/replay`);
}
