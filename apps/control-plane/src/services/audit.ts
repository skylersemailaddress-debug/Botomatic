import { getJson } from "./api";

export async function getProjectAudit(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/audit`);
}
