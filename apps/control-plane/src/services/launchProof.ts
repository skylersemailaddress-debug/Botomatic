import { getJsonSafe, postJsonSafe } from "./api";
import type { ApiResult } from "./truth";

export type LaunchProof = {
  projectId: string;
  verified: boolean;
  verifiedAt?: string;
  verificationMethod?: "benchmark" | "runtime" | "commercial_readiness" | "manual";
  buildStatus?: string;
  commercialReadinessScore?: number;
  lastUpdated: string;
};

export type LaunchProofResponse = {
  launchProof: LaunchProof;
};

export type VerifyLaunchRequest = {
  projectId: string;
  verificationMethod: "benchmark" | "runtime" | "commercial_readiness";
  commercialReadinessScore?: number;
  buildStatus?: string;
};

export type VerifyLaunchResponse = {
  verified: boolean;
  launchProof: LaunchProof;
  message?: string;
};

/**
 * WAVE-038: Launch Proof Service
 * 
 * Provides client-side access to launch proof verification.
 * Hard rules:
 * - No faking launch proof
 * - No setting launchReady from runtime preview alone
 * - No using derivedPreviewUrl as proof
 * - Launch/deploy blocked unless verified proof exists
 */

export async function getLaunchProof(projectId: string): Promise<ApiResult<LaunchProof>> {
  return getJsonSafe<LaunchProof>(`/api/projects/${encodeURIComponent(projectId)}/launch-proof`);
}

export async function verifyLaunch(projectId: string, req: VerifyLaunchRequest): Promise<ApiResult<VerifyLaunchResponse>> {
  return postJsonSafe<VerifyLaunchResponse, VerifyLaunchRequest>(
    `/api/projects/${encodeURIComponent(projectId)}/launch/verify`,
    req
  );
}

export async function deployProject(
  projectId: string,
  environment: string
): Promise<ApiResult<{ status: string; message: string }>> {
  return postJsonSafe<{ status: string; message: string }, { environment: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/deploy`,
    { environment }
  );
}

// Backward-compatible helper used by existing dashboard controls.
export async function requestDeploy(
  projectId: string,
  body: { idempotencyKey: string }
): Promise<ApiResult<{ status: string; message: string }>> {
  void body;
  return deployProject(projectId, "prod");
}

export async function getDeployments(projectId: string): Promise<ApiResult<{ deployments: Record<string, any> }>> {
  return getJsonSafe(`/api/projects/${encodeURIComponent(projectId)}/deployments`);
}

export async function rollbackDeployment(
  projectId: string,
  environment: string
): Promise<ApiResult<{ status: string; message: string }>> {
  return postJsonSafe<{ status: string; message: string }, { environment: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/rollback`,
    { environment }
  );
}
