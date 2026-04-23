import { getJson } from "./api";

export async function getProjectGate(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/gate`);
}
