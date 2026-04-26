import { getJson, postJson } from "./api";

export type SecurityCenterResponse = {
  ok: boolean;
  threatModel: string[];
  rbacMatrix: Array<{ route: string; allowedRoles: string[] }>;
  dataPrivacy: string[];
  dependencyRisk: { high: number; medium: number; low: number; lastScanAt: string };
  supplyChain: { lockfilePresent: boolean; trustedRegistriesOnly: boolean; artifactSigningPlanned: boolean };
  auditLog: Array<{ id: string; type: string; timestamp: string; detail: string }>;
};

export async function getSecurityCenter(projectId: string): Promise<SecurityCenterResponse> {
  return getJson<SecurityCenterResponse>(`/api/projects/${projectId}/ui/security-center`);
}

export async function runDependencyRiskScan(projectId: string): Promise<{ ok: boolean; risk: SecurityCenterResponse["dependencyRisk"] }> {
  return postJson<{ ok: boolean; risk: SecurityCenterResponse["dependencyRisk"] }>(`/api/projects/${projectId}/security-center/dependency-scan`, {});
}
