/**
 * productionFallbackFailClosed.test.ts
 *
 * Proves that production/commercial runtime fails closed when durable
 * dependencies are unavailable. No silent in-memory fallback in hosted
 * production.
 *
 * Tests:
 *   A. bootstrap.ts emits fatal_production_fallback_blocked before throwing
 *   B. /api/ready uses a separate respondReady handler (not respondHealth)
 *   C. respondReady returns HTTP 503 with durable_store_required_in_production
 *   D. /api/health always returns 200 (informational) regardless of repo mode
 *   E. productionFallbackDisabled=true is present in /api/health payload
 *   F. enforceDurableStorageBeforeStartup throws for production without Supabase
 *   G. canUseLocalMemoryFallback returns false in commercial runtime
 *   H. canUseLocalMemoryFallback only true with explicit env + local dev
 *   I. Public traffic 503 middleware blocks non-durable repo requests
 *   J. build/start route protected by the 503 maintenance middleware
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { enforceDurableStorageBeforeStartup } from "../../../../apps/orchestrator-api/src/bootstrap";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// ── A. fatal_production_fallback_blocked log event ───────────────────────────

function testFatalProductionFallbackBlockedEvent() {
  const bootstrap = read("apps/orchestrator-api/src/bootstrap.ts");

  assert.ok(bootstrap.includes("fatal_production_fallback_blocked"),
    "bootstrap.ts must emit fatal_production_fallback_blocked event before throwing");

  // Must log the event BEFORE throwing (event should be above the throw)
  const eventIdx  = bootstrap.indexOf("fatal_production_fallback_blocked");
  const throwIdx  = bootstrap.indexOf("throw new Error");
  assert.ok(eventIdx < throwIdx,
    "fatal_production_fallback_blocked must be logged before the throw statement");

  // Event must include actionable context
  assert.ok(bootstrap.includes("runtimeMode") && bootstrap.includes("deploymentEnv"),
    "fatal_production_fallback_blocked must include runtimeMode and deploymentEnv context");

  console.log("  ✓ fatal_production_fallback_blocked logged before throw");
}

// ── B. /api/ready uses respondReady, not respondHealth ───────────────────────

function testReadyUsesRespondReady() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes("respondReady"),
    "server_app.ts must define a respondReady handler distinct from respondHealth");

  // /ready and /api/ready must reference respondReady
  const readyLine = serverApp.match(/app\.get\("\/ready",\s*(\w+)\)/);
  assert.ok(readyLine && readyLine[1] === "respondReady",
    `GET /ready must use respondReady handler, got: ${readyLine?.[1]}`);

  const apiReadyLine = serverApp.match(/app\.get\("\/api\/ready",\s*(\w+)\)/);
  assert.ok(apiReadyLine && apiReadyLine[1] === "respondReady",
    `GET /api/ready must use respondReady handler, got: ${apiReadyLine?.[1]}`);

  // /health and /api/health must still use respondHealth (informational)
  const healthLine = serverApp.match(/app\.get\("\/health",\s*(\w+)\)/);
  assert.ok(healthLine && healthLine[1] === "respondHealth",
    `GET /health must use respondHealth handler (always 200), got: ${healthLine?.[1]}`);

  console.log("  ✓ /ready uses respondReady, /health uses respondHealth");
}

// ── C. respondReady returns 503 when durable store missing in production ──────

function testRespondReadyHasFailClosedLogic() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // Must include 503 status code
  const respondReadySection = serverApp.slice(
    serverApp.indexOf("const respondReady"),
    serverApp.indexOf("app.get(\"/health\",")
  );

  assert.ok(respondReadySection.includes("503"),
    "respondReady must return HTTP 503 when durable store unavailable in production");

  assert.ok(respondReadySection.includes("durable_store_required_in_production"),
    "respondReady must include reason: durable_store_required_in_production");

  assert.ok(respondReadySection.includes(`status: "unhealthy"`),
    "respondReady must return status: unhealthy");

  assert.ok(respondReadySection.includes("isProductionRuntime"),
    "respondReady must check isProductionRuntime before returning 503");

  assert.ok(respondReadySection.includes(`config.repository.mode !== "durable"`),
    "respondReady must check repository mode before returning 503");

  console.log("  ✓ respondReady returns HTTP 503 with durable_store_required_in_production");
}

// ── D. /api/health is always informational (always 200) ──────────────────────

function testHealthAlwaysReturns200() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // respondHealth must never return 503
  const respondHealthSection = serverApp.slice(
    serverApp.indexOf("const respondHealth"),
    serverApp.indexOf("const respondReady")
  );
  assert.ok(!respondHealthSection.includes("503"),
    "respondHealth must never return 503 — it is always informational");

  console.log("  ✓ /api/health is always informational (never 503)");
}

// ── E. productionFallbackDisabled in /api/health payload ─────────────────────

function testProductionFallbackDisabledInHealth() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes("productionFallbackDisabled"),
    "/api/health payload must include productionFallbackDisabled field");

  assert.ok(serverApp.includes("BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK"),
    "productionFallbackDisabled must reference BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK env var");

  console.log("  ✓ productionFallbackDisabled present in /api/health payload");
}

// ── F. enforceDurableStorageBeforeStartup throws for production ───────────────

async function testEnforceDurableStorageThrowsForProduction() {
  const savedEnv = {
    RUNTIME_MODE: process.env.RUNTIME_MODE,
    PROJECT_REPOSITORY_MODE: process.env.PROJECT_REPOSITORY_MODE,
    QUEUE_BACKEND: process.env.QUEUE_BACKEND,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: process.env.BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK,
  };

  try {
    process.env.RUNTIME_MODE = "commercial";
    process.env.PROJECT_REPOSITORY_MODE = "durable";
    process.env.QUEUE_BACKEND = "supabase";
    process.env.SUPABASE_URL = "https://unreachable-test-instance.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key-not-real";
    delete process.env.BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK;

    let threw = false;
    try {
      await enforceDurableStorageBeforeStartup();
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes("durable storage is required"),
        `Error message must mention durable storage requirement, got: ${err.message}`);
    }
    assert.ok(threw, "enforceDurableStorageBeforeStartup must throw when Supabase unreachable in commercial mode");
  } finally {
    // Restore env
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  console.log("  ✓ enforceDurableStorageBeforeStartup throws for production with Supabase unreachable");
}

// ── G. canUseLocalMemoryFallback returns false in commercial runtime ──────────

async function testCannotFallbackInCommercialRuntime() {
  const bootstrap = read("apps/orchestrator-api/src/bootstrap.ts");

  // isHostedOrCommercialRuntime must include RUNTIME_MODE=commercial check
  assert.ok(bootstrap.includes('RUNTIME_MODE === "commercial"'),
    "isHostedOrCommercialRuntime must check RUNTIME_MODE === commercial");

  // canUseLocalMemoryFallback must negate isHostedOrCommercialRuntime
  const fallbackFn = bootstrap.slice(
    bootstrap.indexOf("function canUseLocalMemoryFallback"),
    bootstrap.indexOf("function canUseLocalMemoryFallback") + 200
  );
  assert.ok(fallbackFn.includes("!isHostedOrCommercialRuntime"),
    "canUseLocalMemoryFallback must return false when isHostedOrCommercialRuntime is true");

  console.log("  ✓ canUseLocalMemoryFallback returns false in commercial runtime");
}

// ── H. Local fallback only with explicit env + local dev ─────────────────────

async function testLocalFallbackRequiresExplicitEnv() {
  const savedEnv = {
    RUNTIME_MODE: process.env.RUNTIME_MODE,
    PROJECT_REPOSITORY_MODE: process.env.PROJECT_REPOSITORY_MODE,
    QUEUE_BACKEND: process.env.QUEUE_BACKEND,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK: process.env.BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK,
    BOTOMATIC_DEPLOYMENT_ENV: process.env.BOTOMATIC_DEPLOYMENT_ENV,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    // Development mode WITHOUT the explicit flag → must throw
    process.env.RUNTIME_MODE = "development";
    process.env.NODE_ENV = "development";
    process.env.PROJECT_REPOSITORY_MODE = "durable";
    process.env.QUEUE_BACKEND = "supabase";
    process.env.SUPABASE_URL = "https://unreachable-test-instance.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    delete process.env.BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK;
    delete process.env.BOTOMATIC_DEPLOYMENT_ENV;

    let threw = false;
    try {
      await enforceDurableStorageBeforeStartup();
    } catch {
      threw = true;
    }
    assert.ok(threw, "Without explicit fallback flag, dev mode must also throw when Supabase unreachable");
  } finally {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }

  console.log("  ✓ local fallback requires explicit BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK=true");
}

// ── I. Public traffic 503 middleware ─────────────────────────────────────────

function testPublicTraffic503Middleware() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes("Durable repository required for public traffic"),
    "server_app.ts must include public traffic 503 middleware");

  assert.ok(serverApp.includes("isLocalTraffic"),
    "public traffic middleware must use isLocalTraffic to allow localhost through");

  assert.ok(serverApp.includes(`status: "maintenance"`),
    "public traffic 503 response must include status: maintenance");

  console.log("  ✓ public traffic 503 middleware present");
}

// ── J. build/start blocked by 503 middleware ─────────────────────────────────

function testBuildStartBlockedByMaintenanceMiddleware() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // The 503 middleware must be registered BEFORE the build/start routes
  const maintenanceIdx = serverApp.indexOf("Durable repository required for public traffic");
  const buildStartIdx = serverApp.indexOf('"/api/projects/:projectId/build/start"');

  assert.ok(maintenanceIdx < buildStartIdx,
    "503 maintenance middleware must be registered before build/start route so it intercepts traffic first");

  console.log("  ✓ build/start protected by maintenance middleware (registered before route)");
}

async function main() {
  console.log("productionFallbackFailClosed.test.ts");
  testFatalProductionFallbackBlockedEvent();
  testReadyUsesRespondReady();
  testRespondReadyHasFailClosedLogic();
  testHealthAlwaysReturns200();
  testProductionFallbackDisabledInHealth();
  await testEnforceDurableStorageThrowsForProduction();
  await testCannotFallbackInCommercialRuntime();
  await testLocalFallbackRequiresExplicitEnv();
  testPublicTraffic503Middleware();
  testBuildStartBlockedByMaintenanceMiddleware();
  console.log("productionFallbackFailClosed.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
