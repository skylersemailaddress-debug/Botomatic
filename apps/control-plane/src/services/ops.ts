import { getJson } from "./api";

export type OpsMetrics = {
  packetSuccessCount: number;
  packetFailureCount: number;
  promotionCount: number;
};

export type OpsError = {
  type: string;
  message: string;
};

export type OpsErrorsResponse = {
  errors: OpsError[];
  count: number;
};

export type OpsQueue = {
  activeWorkers: number;
  workerConcurrency: number;
  queueDepth: number;
};

export async function getOpsMetrics() {
  return getJson<OpsMetrics>(`/api/ops/metrics`);
}

export async function getOpsErrors() {
  return getJson<OpsErrorsResponse>(`/api/ops/errors`);
}

export async function getOpsQueue() {
  return getJson<OpsQueue>(`/api/ops/queue`);
}
