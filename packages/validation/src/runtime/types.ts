export type RuntimeCheckResult = {
  name: string;
  status: "passed" | "failed" | "skipped";
  details: string;
};

export type RuntimeSuiteResult = {
  suite: string;
  checks: RuntimeCheckResult[];
};

export function summarizeRuntimeSuite(result: RuntimeSuiteResult): { passed: number; failed: number; skipped: number } {
  const passed = result.checks.filter((c) => c.status === "passed").length;
  const failed = result.checks.filter((c) => c.status === "failed").length;
  const skipped = result.checks.filter((c) => c.status === "skipped").length;
  return { passed, failed, skipped };
}
