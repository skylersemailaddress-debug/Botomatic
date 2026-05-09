export interface DashboardQueryRequest {
  tenantId: string;
  projectId: string;
  metric: string;
}

export interface DashboardQueryResult {
  metric: string;
  points: Array<{
    timestamp: string;
    value: number;
  }>;
}

export interface DashboardQueryApi {
  query(request: DashboardQueryRequest): Promise<DashboardQueryResult>;
}

export function createMemoryDashboardQueryApi(): DashboardQueryApi {
  return {
    async query(request) {
      return {
        metric: request.metric,
        points: [
          {
            timestamp: new Date().toISOString(),
            value: 1,
          },
        ],
      };
    },
  };
}
