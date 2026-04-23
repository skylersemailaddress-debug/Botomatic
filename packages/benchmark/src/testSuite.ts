export type BenchmarkCase = {
  id: string;
  input: string;
  expectedEntities: string[];
  expectedWorkflows: string[];
};

const cases: BenchmarkCase[] = [];

export function registerCase(c: BenchmarkCase) {
  cases.push(c);
}

export function getCases(): BenchmarkCase[] {
  return cases;
}
