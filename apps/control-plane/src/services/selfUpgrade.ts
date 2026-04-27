import { getJson, postJson } from "./api";

export type SelfUpgradeStatus = {
  spec: any;
  drift: any;
  regression: any;
};

export async function getSelfUpgradeStatus(projectId: string) {
  return getJson<SelfUpgradeStatus>(`/api/projects/${encodeURIComponent(projectId)}/self-upgrade/status`);
}

export async function createSelfUpgradeSpec(projectId: string, request: string) {
  return postJson(`/api/projects/${encodeURIComponent(projectId)}/self-upgrade/spec`, { request });
}
