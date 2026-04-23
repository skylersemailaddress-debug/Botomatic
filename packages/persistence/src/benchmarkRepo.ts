import { pool } from "./dbClient";

export interface BenchmarkRun {
  runId: string;
  suite: string;
  score: number;
  passed: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export async function saveBenchmarkRun(run: BenchmarkRun) {
  await pool.query(
    `INSERT INTO benchmark_runs (run_id, suite, score, passed, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (run_id)
     DO UPDATE SET suite = EXCLUDED.suite, score = EXCLUDED.score, passed = EXCLUDED.passed, metadata = EXCLUDED.metadata, created_at = EXCLUDED.created_at`,
    [
      run.runId,
      run.suite,
      run.score,
      run.passed,
      JSON.stringify(run.metadata || {}),
      run.createdAt,
    ]
  );
}

export async function getBenchmarkRuns(suite?: string): Promise<BenchmarkRun[]> {
  const res = suite
    ? await pool.query(`SELECT * FROM benchmark_runs WHERE suite = $1 ORDER BY created_at ASC`, [suite])
    : await pool.query(`SELECT * FROM benchmark_runs ORDER BY created_at ASC`);

  return res.rows.map((r) => ({
    runId: r.run_id,
    suite: r.suite,
    score: r.score,
    passed: r.passed,
    metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata || "{}") : r.metadata,
    createdAt: r.created_at,
  }));
}
