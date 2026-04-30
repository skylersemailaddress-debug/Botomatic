import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/execution/[runId]/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts",
  "apps/control-plane/src/server/executionStore.ts",
  "apps/control-plane/src/server/executionRunner.ts",
]) assert(exists(rel), `missing required file: ${rel}`);

const runner = read("apps/control-plane/src/server/executionRunner.ts");
for (const jt of ["test", "build", "file_diff", "lint", "typecheck"]) assert(runner.includes(`"${jt}"`), `missing allowlisted type ${jt}`);
assert(runner.includes("ALLOWLISTED_JOB_TYPES"), "missing allowlist constant");
assert(!runner.includes("exec("), "must not use broad exec shell");

const jobsRoute = read("apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts");
assert(jobsRoute.includes("idempotencyKey is required"), "idempotency requirement missing in jobs route");
assert(jobsRoute.includes("blocked_job_type"), "disallowed job types must be blocked/rejected");

const executionRoute = read("apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts");
assert(executionRoute.includes("idempotencyKey is required"), "idempotency requirement missing in execution route");

const store = read("apps/control-plane/src/server/executionStore.ts");
for (const marker of ["checksum", "redactLine", "runs", "idempotency", "data/execution"]) assert(store.includes(marker), `missing receipt/evidence marker ${marker}`);

const executionService = read("apps/control-plane/src/services/execution.ts");
for (const endpoint of ["/api/projects/${encodeURIComponent(projectId)}/execution/${encodeURIComponent(runId)}", "/api/projects/${encodeURIComponent(projectId)}/execution", "/api/projects/${encodeURIComponent(projectId)}/jobs"]) assert(executionService.includes(endpoint), `missing endpoint ${endpoint}`);
assert(!executionService.includes("/api/orchestrate/action"), "must not actively use /api/orchestrate/action");
assert(!executionService.includes("/api/hybrid-ci"), "must not actively use /api/hybrid-ci");

const pkg = read("package.json");
for (const wave of ["025","026","027","028","029","030","031","032","033","034","035"]) assert(pkg.includes(`test:wave-${wave}`), `missing prior wave script ${wave}`);
assert(pkg.includes("test:wave-036"), "missing test:wave-036 script");

console.log("WAVE-036 runner API implementation checks passed");
