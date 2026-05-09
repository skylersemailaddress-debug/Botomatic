import type { DashboardQueryResult } from './dashboardQueryApi.js';

export interface DashboardAggregationRequest {
  metric: string;
  results: DashboardQueryResult[];
}

export interface DashboardAggregationResult {
  metric: string;
  totalPoints: number;
}

export function aggregateDashboardResults(
  request: DashboardAggregationRequest,
): DashboardAggregationResult {
  return {
    metric: request.metric,
    totalPoints: request.results.reduce((sum, result) => {
      return sum + result.points.length;
    }, 0),
  };
}
