import { BenchmarkResult } from "./runner";

export type BenchmarkSummary = {
  totalCases: number;
  passedCases: number;
  passRate: number;
  averageEntityScore: number;
  averageWorkflowScore: number;
  overallScore: number;
  enterpriseReady: boolean;
};

export function summarizeBenchmarkResults(results: BenchmarkResult[]): BenchmarkSummary {
  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const averageEntityScore = totalCases === 0 ? 0 : results.reduce((sum, r) => sum + r.entityScore, 0) / totalCases;
  const averageWorkflowScore = totalCases === 0 ? 0 : results.reduce((sum, r) => sum + r.workflowScore, 0) / totalCases;
  const passRate = totalCases === 0 ? 0 : passedCases / totalCases;
  const overallScore = (averageEntityScore + averageWorkflowScore + passRate) / 3;
  const enterpriseReady = overallScore >= 0.85 && passRate >= 0.8;

  return {
    totalCases,
    passedCases,
    passRate,
    averageEntityScore,
    averageWorkflowScore,
    overallScore,
    enterpriseReady,
  };
}
