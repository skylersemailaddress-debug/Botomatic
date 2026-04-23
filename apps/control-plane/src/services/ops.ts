import { getJson } from "./api";

export async function getOpsMetrics() {
  return getJson(`/api/ops/metrics`);
}

export async function getOpsErrors() {
  return getJson(`/api/ops/errors`);
}

export async function getOpsQueue() {
  return getJson(`/api/ops/queue`);
}
