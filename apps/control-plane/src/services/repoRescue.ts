import { getJson, postJson } from "./api";

export type RepoRescueStatus = {
  completionContract: any;
  repairPlan: any;
  existingRepoValidation: any;
};

export async function getRepoRescueStatus(projectId: string) {
  return getJson<RepoRescueStatus>(`/api/projects/${encodeURIComponent(projectId)}/repo/status`);
}

export async function runRepoCompletionContract(projectId: string, request: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/repo/completion-contract`, { request });
}
