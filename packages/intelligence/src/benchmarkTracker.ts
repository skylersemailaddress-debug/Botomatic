import { saveBenchmarkRun, BenchmarkRun } from "../../persistence/src/benchmarkRepo";

export async function recordBenchmarkRun(run: BenchmarkRun) {
  await saveBenchmarkRun(run);
  return run;
}

export function evaluateBenchmark(score: number, threshold: number) {
  return {
    score,
    passed: score >= threshold,
  };
}
