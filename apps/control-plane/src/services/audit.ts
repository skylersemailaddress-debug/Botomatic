import { getJson } from "./api";

export type ProjectAuditEvent = {
  id?: string;
  type: string;
  actorId?: string;
  timestamp?: string;
};

export type ProjectAuditResponse = {
  events: ProjectAuditEvent[];
};

export async function getProjectAudit(projectId: string) {
  return getJson<ProjectAuditResponse>(`/api/projects/${projectId}/ui/audit`);
}
