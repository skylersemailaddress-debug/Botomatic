import { getJsonSafe } from "./api";

export type RuntimeProof = { healthcheckUrl?: string; healthcheckStatus?: number; verifiedAt?: string; verifier?: string; receiptId?: string; checksum?: string };
export type ProjectRuntimeState = { status?: string; state?: string; previewUrl?: string; verifiedPreviewUrl?: string; derivedPreviewUrl?: string; proof?: RuntimeProof };

export async function getProjectRuntimeState(projectId: string): Promise<ProjectRuntimeState> {
  const runtimeResult = await getJsonSafe<ProjectRuntimeState>(`/api/projects/${encodeURIComponent(projectId)}/runtime`);
  if (runtimeResult.ok) {
    const state = runtimeResult.data?.state || runtimeResult.data?.status;
    return {
      ...runtimeResult.data,
      status: state,
      state,
      previewUrl: runtimeResult.data?.verifiedPreviewUrl || runtimeResult.data?.previewUrl || runtimeResult.data?.derivedPreviewUrl,
    };
  }

  const statusResult = await getJsonSafe<{ runtime?: { status?: string; previewUrl?: string } }>(`/api/projects/${encodeURIComponent(projectId)}/status`);
  if (!statusResult.ok) return {};
  return statusResult.data?.runtime ?? {};
}
