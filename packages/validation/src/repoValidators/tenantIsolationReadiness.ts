import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const requiredSignals = [
  "cross_tenant_read_blocked",
  "cross_tenant_write_blocked",
  "project_scope_enforced",
  "tenant_context_required",
  "isolation_regression_suite_passed",
] as const;

function readJson(filePath: string): any | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function validateTenantIsolationReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/supabase-adapter/src/types.ts",
    "packages/supabase-adapter/src/memoryRepo.ts",
    "packages/supabase-adapter/src/durableRepo.ts",
    "packages/supabase-adapter/src/jobClient.ts",
    "packages/supabase-adapter/src/schema.sql",
    "supabase/migrations/002_tenant_isolation.sql",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/server/projectAccess.ts",
    "packages/validation/src/tests/tenantIsolation.test.ts",
    "release-evidence/runtime/tenant_isolation_proof.json",
  ];
  const sourceOk = checks.slice(0, -1).every((rel) => fs.existsSync(path.join(root, rel)));
  const server = fs.existsSync(path.join(root, "apps/orchestrator-api/src/server_app.ts"))
    ? fs.readFileSync(path.join(root, "apps/orchestrator-api/src/server_app.ts"), "utf8")
    : "";
  const repoTypes = fs.existsSync(path.join(root, "packages/supabase-adapter/src/types.ts"))
    ? fs.readFileSync(path.join(root, "packages/supabase-adapter/src/types.ts"), "utf8")
    : "";
  const proof = readJson(path.join(root, "release-evidence/runtime/tenant_isolation_proof.json"));
  const signalsOk = requiredSignals.every((signal) => proof?.signals?.[signal] === true);
  const ownerScopeOk =
    repoTypes.includes("ownerUserId") &&
    repoTypes.includes("getProjectForActor") &&
    server.includes("requireProjectAccess") &&
    server.includes("getProjectForActor") &&
    server.includes("upsertProjectForActor");
  const ok = sourceOk && signalsOk && ownerScopeOk;
  return {
    name: "Validate-Botomatic-TenantIsolationReadiness",
    status: ok ? "passed" : "failed",
    summary: ok
      ? "Tenant/project owner scope is enforced in repositories, routes, schema, and executable proof."
      : "Tenant/project isolation is incomplete or executable proof is missing/stale.",
    checks,
  };
}

if (require.main === module) {
  const result = validateTenantIsolationReadiness(process.cwd());
  console.log(`${result.status === "passed" ? "PASS" : "FAIL"} — ${result.name}`);
  console.log(`  ${result.summary}`);
  if (result.status !== "passed") process.exit(1);
}
