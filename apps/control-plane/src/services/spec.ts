import { getJson, postJson } from "./api";

export type SpecStatus = {
  ok: boolean;
  style: string | null;
  spec: any;
  clarifications: any[];
  contract: any;
  buildBlocked: boolean;
  blockers: string[];
  readiness: {
    criticalCompleteness: number;
    commercialCompleteness: number;
    implementationCompleteness: number;
    launchCompleteness: number;
    riskCompleteness: number;
  };
};

export function getSpecStatus(projectId: string) {
  return getJson<SpecStatus>(`/api/projects/${encodeURIComponent(projectId)}/spec/status`);
}

export function analyzeSpec(projectId: string, message?: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/analyze`, { message });
}

export function getClarifications(projectId: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/clarify`);
}

export function acceptAssumptions(projectId: string, assumptionIds: string[]) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/assumptions/accept`, { assumptionIds });
}

export function applyRecommendations(projectId: string, acceptedIds: string[], rejectedIds: string[] = []) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/recommendations/apply`, { acceptedIds, rejectedIds });
}

export function generateBuildContract(projectId: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/build-contract`);
}

export function approveBuildContract(projectId: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/spec/approve`);
}
