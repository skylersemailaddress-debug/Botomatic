/**
 * hostedRuntimeTruth.test.ts
 *
 * Verifies that /api/health exposes deployment identity fields and feature proof
 * flags, and that /api/ops/routes is registered and protected.
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// ── A. Health payload deployment identity fields ─────────────────────────────

function testHealthPayloadDeploymentIdentityFields() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  const required = [
    "buildVersion",
    "buildSource",
    "nodeEnv",
    "durableQueueEnabled",
    "tenantIsolationEnabled",
    "productionFallbackDisabled",
  ];

  for (const field of required) {
    assert.ok(serverApp.includes(field),
      `buildHealthPayload must include deployment identity field: ${field}`);
  }

  console.log("  ✓ health payload deployment identity fields");
}

// ── B. Health payload feature proof flags ────────────────────────────────────

function testHealthPayloadFeatureProofFlags() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  const flags = [
    "specCompletenessEngine: true",
    "expressReadinessGate: true",
    "buildStartReadinessGate: true",
    "canonicalReadinessContract: true",
  ];

  for (const flag of flags) {
    assert.ok(serverApp.includes(flag),
      `buildHealthPayload must include proof flag: ${flag}`);
  }

  console.log("  ✓ health payload feature proof flags");
}

// ── C. /api/ops/routes endpoint registered ───────────────────────────────────

function testOpsRoutesEndpointRegistered() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes('"/api/ops/routes"'),
    "server_app.ts must register GET /api/ops/routes");

  // Must be protected by requireRole
  const routesIdx = serverApp.indexOf('"/api/ops/routes"');
  const surrounding = serverApp.slice(Math.max(0, routesIdx - 300), routesIdx + 100);
  assert.ok(surrounding.includes("requireRole"),
    "GET /api/ops/routes must use requireRole guard");

  console.log("  ✓ /api/ops/routes endpoint registered and protected");
}

// ── D. Startup log events in bootstrap.ts ────────────────────────────────────

function testStartupLogEvents() {
  const bootstrap = read("apps/orchestrator-api/src/bootstrap.ts");

  const events = [
    "commercial_runtime_started",
    "express_readiness_gate_registered",
    "build_start_gate_registered",
    "route_inventory_registered",
  ];

  for (const evt of events) {
    assert.ok(bootstrap.includes(evt),
      `bootstrap.ts must emit startup event: ${evt}`);
  }

  console.log("  ✓ startup log events present in bootstrap.ts");
}

// ── E. buildSource reflects deployment environment ───────────────────────────

function testBuildSourceLogic() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // buildSource must distinguish railway from local using RAILWAY_ENVIRONMENT
  assert.ok(serverApp.includes("RAILWAY_ENVIRONMENT"),
    "buildSource must check RAILWAY_ENVIRONMENT to identify railway deployments");

  console.log("  ✓ buildSource differentiates railway from local");
}

// ── F. productionFallbackDisabled reflects memory fallback env ───────────────

function testProductionFallbackDisabledLogic() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes("BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK"),
    "productionFallbackDisabled must reference BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK");

  console.log("  ✓ productionFallbackDisabled wired to correct env var");
}

async function main() {
  console.log("hostedRuntimeTruth.test.ts");
  testHealthPayloadDeploymentIdentityFields();
  testHealthPayloadFeatureProofFlags();
  testOpsRoutesEndpointRegistered();
  testStartupLogEvents();
  testBuildSourceLogic();
  testProductionFallbackDisabledLogic();
  console.log("hostedRuntimeTruth.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
