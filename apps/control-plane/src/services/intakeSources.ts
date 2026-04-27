import { getJson, postJson } from "./api";

export type IntakeSource = {
  sourceId: string;
  projectId: string;
  sourceType: string;
  sourceUri: string;
  displayName: string;
  status: string;
  sizeBytes: number | null;
  estimatedSizeBytes: number | null;
  provider: string;
  authRequired: boolean;
  authStatus: string;
  safetyStatus: string;
  ingestionMode: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export type IntakeRouteResult = {
  accepted: boolean;
  rejected: boolean;
  recommendedIntakePath: string;
  reason: string;
  nextAction: string;
  requiredCredentials: string[];
  expectedProcessingSteps: string[];
};

export type IntakeSourceResponse = {
  source: IntakeSource;
  route: IntakeRouteResult;
  manifestPath?: string;
  message?: string;
};

export async function createIntakeSource(projectId: string, payload: Record<string, unknown>) {
  return postJson<IntakeSourceResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/source`, payload);
}

export async function listIntakeSources(projectId: string) {
  return getJson<{ sources: IntakeSource[] }>(`/api/projects/${encodeURIComponent(projectId)}/intake/sources`);
}

export async function getIntakeSource(projectId: string, sourceId: string) {
  return getJson<{ source: IntakeSource }>(`/api/projects/${encodeURIComponent(projectId)}/intake/sources/${encodeURIComponent(sourceId)}`);
}

export async function intakePastedText(projectId: string, text: string, displayName = "Pasted spec") {
  return postJson<IntakeSourceResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/pasted-text`, {
    text,
    displayName,
  });
}

export async function intakeGithub(projectId: string, payload: {
  sourceUrl: string;
  allowClone?: boolean;
  githubToken?: string;
}) {
  return postJson<IntakeSourceResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/github`, payload);
}

export async function intakeCloudLink(projectId: string, payload: {
  sourceUrl: string;
  estimatedSizeBytes?: number;
  hasConnectorCredentials?: boolean;
  largeDownloadApproval?: boolean;
}) {
  return postJson<IntakeSourceResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/cloud-link`, payload);
}

export async function intakeLocalManifest(projectId: string, manifest: Record<string, unknown>) {
  return postJson<IntakeSourceResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/local-manifest`, { manifest });
}
