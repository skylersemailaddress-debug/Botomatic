import { getJson } from "./api";

export type ProjectAuditEvent = {
  id?: string;
  type: string;
  actorId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export type ProjectAuditResponse = {
  events: ProjectAuditEvent[];
};

export async function getProjectAudit(projectId: string) {
  return getJson<ProjectAuditResponse>(`/api/projects/${projectId}/ui/audit`);
}
