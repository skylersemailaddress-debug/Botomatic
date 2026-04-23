export type OpsMetrics = {
  queueDepth: number;
  activeWorkers: number;
  workerConcurrency: number;
  packetSuccessCount: number;
  packetFailureCount: number;
  validationPassCount: number;
  validationFailCount: number;
  promotionCount: number;
  routeErrorCount: number;
  lastUpdatedAt: string;
};

export type OpsErrorEvent = {
  id: string;
  type: "route_error" | "packet_failed" | "promotion_failed" | "auth_failed";
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
};
