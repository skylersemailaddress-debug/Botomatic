import { getJsonSafe } from "./api";

export type ProjectRuntimeState = { status?: string; previewUrl?: string };

export async function getProjectRuntimeState(projectId: string): Promise<ProjectRuntimeState> {
  const result = await getJsonSafe<{ runtime?: ProjectRuntimeState }>(`/api/projects/${projectId}/status`);
  if (!result.ok) return {};
  return result.data?.runtime ?? {};
}
