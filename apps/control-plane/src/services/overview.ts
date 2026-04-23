import { getJson } from "./api";

export async function getProjectOverview(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/overview`);
}
