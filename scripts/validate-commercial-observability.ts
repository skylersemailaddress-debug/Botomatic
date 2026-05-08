import fs from "fs";
import path from "path";
import { listRegisteredMetricNames } from "../apps/orchestrator-api/src/observability";

const ROOT = process.cwd();
const VALIDATOR_NAME = "Validate-Botomatic-CommercialObservabilityAndSupport";
const REQUIRED_LOG_FIELDS = ["requestId", "actorId", "tenantId", "outcome", "errorCategory"];
const REQUIRED_METRICS = [
  "botomatic_request_total",
  "botomatic_error_rate",
  "botomatic_queue_depth",
  "botomatic_worker_count",
  "botomatic_job_success_total",
  "botomatic_job_failure_total",
  "botomatic_idempotency_hits_total",
  "botomatic_duplicate_enqueue_prevented_total",
  "botomatic_repair_attempts_total",
  "botomatic_repair_exhausted_total",
  "botomatic_readiness_locked_total",
  "botomatic_readiness_unlocked_total",
  "botomatic_provider_latency_ms",
  "botomatic_provider_errors_total",
  "botomatic_upload_failures_total",
];
const REQUIRED_ADMIN_ENDPOINTS = [
  'app.get("/admin/projects/:projectId/state"',
  'app.get("/admin/build-runs/:buildRunId"',
  'app.get("/admin/job-queue"',
  'app.get("/admin/readiness/:projectId"',
  'app.post("/admin/jobs/:jobId/replay"',
  'app.post("/admin/build-runs/:buildRunId/cancel"',
  'app.get("/admin/projects/:projectId/evidence-bundle"',
];
const REQUIRED_RUNBOOKS = [
  "supabase-outage.md",
  "provider-outage.md",
  "queue-backlog.md",
  "bad-deploy-rollback.md",
  "stuck-build.md",
  "data-isolation-alert.md",
  "upload-abuse.md",
];
const TEST_CATEGORY_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "request ID propagation", pattern: /request ID propagation/i },
  { name: "audit event on denied access", pattern: /audit event on denied access/i },
  { name: "ops metrics include key counters", pattern: /ops metrics include key counters/i },
  { name: "support endpoints require admin\/operator role", pattern: /support endpoints require admin\/operator role/i },
];

// Call-site wiring table: metric name → expected snippet in server_app.ts
const METRIC_CALL_SITE_CHECKS: Array<{ metric: string; snippet: string }> = [
  { metric: "botomatic_request_total", snippet: 'incrementMetric("botomatic_request_total"' },
  { metric: "botomatic_job_success_total", snippet: 'incrementMetric("botomatic_job_success_total"' },
  { metric: "botomatic_job_failure_total", snippet: 'incrementMetric("botomatic_job_failure_total"' },
  { metric: "botomatic_repair_attempts_total", snippet: 'incrementMetric("botomatic_repair_attempts_total"' },
  { metric: "botomatic_repair_exhausted_total", snippet: 'incrementMetric("botomatic_repair_exhausted_total"' },
  { metric: "botomatic_readiness_locked_total", snippet: 'incrementMetric("botomatic_readiness_locked_total"' },
  { metric: "botomatic_readiness_unlocked_total", snippet: 'incrementMetric("botomatic_readiness_unlocked_total"' },
  { metric: "botomatic_provider_latency_ms", snippet: 'observeMetric("botomatic_provider_latency_ms"' },
  { metric: "botomatic_upload_failures_total", snippet: 'incrementMetric("botomatic_upload_failures_total"' },
  { metric: "botomatic_queue_depth", snippet: 'setMetric("botomatic_queue_depth"' },
  { metric: "botomatic_worker_count", snippet: 'setMetric("botomatic_worker_count"' },
];

type Row = {
  check: string;
  status: "PASS" | "FAIL";
  detail: string;
};

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function listTestFiles(dir: string): string[] {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((entry) => entry.endsWith(".test.ts"))
    .map((entry) => path.join(root, entry));
}

function row(ok: boolean, check: string, detail: string): Row {
  return { check, status: ok ? "PASS" : "FAIL", detail };
}

function main() {
  const rows: Row[] = [];
  const observabilitySource = read("apps/orchestrator-api/src/observability.ts");
  const serverSource = read("apps/orchestrator-api/src/server_app.ts");
  const routePoliciesSource = read("apps/orchestrator-api/src/security/routePolicies.ts");
  const metrics = new Set(listRegisteredMetricNames());
  const runbookDir = path.join(ROOT, "docs/runbooks");
  const testFiles = listTestFiles("packages/validation/src/tests");
  const testSources = testFiles.map((file) => fs.readFileSync(file, "utf8"));

  const missingLogFields = REQUIRED_LOG_FIELDS.filter((field) => !observabilitySource.includes(field) && !serverSource.includes(field));
  rows.push(row(missingLogFields.length === 0, "structured log fields", missingLogFields.length === 0 ? "All required log fields are emitted in observability sources." : `Missing fields: ${missingLogFields.join(", ")}`));

  const missingMetrics = REQUIRED_METRICS.filter((metric) => !metrics.has(metric));
  rows.push(row(missingMetrics.length === 0, "metrics registered", missingMetrics.length === 0 ? `Registered ${REQUIRED_METRICS.length} required metrics.` : `Missing metrics: ${missingMetrics.join(", ")}`));

  const missingEndpoints = REQUIRED_ADMIN_ENDPOINTS.filter((snippet) => !serverSource.includes(snippet));
  rows.push(row(missingEndpoints.length === 0, "admin endpoints declared", missingEndpoints.length === 0 ? `Declared ${REQUIRED_ADMIN_ENDPOINTS.length} required admin routes.` : `Missing route snippets: ${missingEndpoints.join(" | ")}`));

  const missingRunbooks = REQUIRED_RUNBOOKS.filter((name) => !fs.existsSync(path.join(runbookDir, name)));
  rows.push(row(missingRunbooks.length === 0, "incident runbooks present", missingRunbooks.length === 0 ? `Found ${REQUIRED_RUNBOOKS.length} runbook files.` : `Missing runbooks: ${missingRunbooks.join(", ")}`));

  const missingTestCategories = TEST_CATEGORY_PATTERNS.filter(({ pattern }) => !testSources.some((source) => pattern.test(source))).map(({ name }) => name);
  rows.push(row(missingTestCategories.length === 0, "test coverage categories present", missingTestCategories.length === 0 ? `Found all ${TEST_CATEGORY_PATTERNS.length} required test categories.` : `Missing categories: ${missingTestCategories.join(", ")}`));

  // New check: metric call-site wiring
  const missingCallSites = METRIC_CALL_SITE_CHECKS.filter(({ snippet }) => !serverSource.includes(snippet)).map(({ metric }) => metric);
  rows.push(row(missingCallSites.length === 0, "metric call-site wiring", missingCallSites.length === 0 ? `All ${METRIC_CALL_SITE_CHECKS.length} metric call sites found in server_app.ts.` : `Missing call sites for: ${missingCallSites.join(", ")}`));

  // New check: role rank table not inverted
  const rankCorrect = routePoliciesSource.includes("reviewer: 1") && routePoliciesSource.includes("operator: 2");
  rows.push(row(rankCorrect, "role rank table not inverted", rankCorrect ? "routePolicies.ts rank table has reviewer: 1, operator: 2." : "routePolicies.ts rank table is inverted — reviewer must be 1, operator must be 2."));

  // New check: requireAnyRole anonymous rejection present
  const hasAnonymousGuard = serverSource.includes('"authenticated_actor_required"');
  rows.push(row(hasAnonymousGuard, "requireAnyRole anonymous rejection present", hasAnonymousGuard ? 'server_app.ts contains "authenticated_actor_required" guard.' : 'server_app.ts is missing "authenticated_actor_required" in requireAnyRole.'));

  // New check: /api/ops/metrics enforces operator role
  const hasOperatorOpsMetrics = !serverSource.includes('requireRole("reviewer", config), respondOpsMetrics');
  rows.push(row(hasOperatorOpsMetrics, "/api/ops/metrics enforces operator role", hasOperatorOpsMetrics ? "/api/ops/metrics does not use reviewer role — operator enforced correctly." : '/api/ops/metrics incorrectly uses requireRole("reviewer") instead of requireRole("operator").'));

  console.log(`\n${VALIDATOR_NAME}\n`);
  console.table(rows);

  const failed = rows.filter((entry) => entry.status === "FAIL");
  if (failed.length > 0) {
    console.log(`\u001b[31m${VALIDATOR_NAME} failed\u001b[0m`);
    process.exit(1);
  }
  console.log(`\u001b[32m${VALIDATOR_NAME} passed\u001b[0m`);
}

main();

