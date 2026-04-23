import { getCases, BenchmarkCase } from "./testSuite";

export type BenchmarkResult = {
  caseId: string;
  entityScore: number;
  workflowScore: number;
  passed: boolean;
};

function overlapScore(expected: string[], actual: string[]): number {
  if (expected.length === 0) return 1;
  const hits = expected.filter((item) => actual.includes(item)).length;
  return hits / expected.length;
}

export function runBenchmarks(executor: (input: string) => { entities: string[]; workflows: string[] }): BenchmarkResult[] {
  const cases: BenchmarkCase[] = getCases();

  return cases.map((c) => {
    const actual = executor(c.input);
    const entityScore = overlapScore(c.expectedEntities, actual.entities || []);
    const workflowScore = overlapScore(c.expectedWorkflows, actual.workflows || []);
    const passed = entityScore >= 0.8 && workflowScore >= 0.8;

    return {
      caseId: c.id,
      entityScore,
      workflowScore,
      passed,
    };
  });
}
