import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function has(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function run() {
  const projectAccess = read("apps/control-plane/src/server/projectAccess.ts");
  const runtimeRoute = read("apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts");
  const buildStart = read("apps/control-plane/src/app/api/projects/[projectId]/build/start/route.ts");
  const launchFull = read("scripts/launchBetaFull.ps1");
  const catchAllProxy = read("apps/control-plane/src/app/api/[...path]/route.ts");

  // --- 1. Beta bypass must be unconditional when token is set and valid --------

  // Must NOT gate on the incoming request's Authorization header matching betaToken.
  // The old code checked `authHeader === \`Bearer ${betaToken}\`` which silently
  // blocked browser requests that send no auth header.
  assert(
    !projectAccess.includes("authHeader === `Bearer ${betaToken}`"),
    "projectAccess.ts beta bypass must NOT compare incoming auth header to betaToken — browser requests arrive with no auth header and would fail this conditional",
  );

  // Must check JWT format before granting admin (security: ignore malformed tokens).
  assert(
    projectAccess.includes('betaToken.startsWith("eyJ")'),
    'projectAccess.ts beta bypass must validate betaToken.startsWith("eyJ") before granting admin',
  );

  // Must still grant admin role when token is valid.
  assert(
    projectAccess.includes('role: "admin"'),
    "projectAccess.ts beta bypass must return role: admin",
  );

  // Must still use BOTOMATIC_BETA_USER_ID for actorId.
  assert(
    projectAccess.includes("BOTOMATIC_BETA_USER_ID"),
    "projectAccess.ts beta bypass must use BOTOMATIC_BETA_USER_ID env var for actorId",
  );

  // Admin role must bypass owner registry (Railway-created projects not in local file).
  assert(
    projectAccess.includes('actor.role === "admin"'),
    "requireControlPlaneProjectAccess must short-circuit owner check when actor.role === admin",
  );

  // --- 2. Diagnostic fields in 401 / 403 responses ----------------------------

  assert(
    projectAccess.includes("tokenConfigured"),
    "requireControlPlaneProjectAccess 401 response must include tokenConfigured for self-serve diagnostics",
  );
  assert(
    projectAccess.includes("tokenLooksLikeJwt"),
    "requireControlPlaneProjectAccess 401 response must include tokenLooksLikeJwt for self-serve diagnostics",
  );
  assert(
    projectAccess.includes("actorResolved"),
    "requireControlPlaneProjectAccess 401 response must include actorResolved for self-serve diagnostics",
  );

  // --- 3. runtime route must proxy to Railway in beta mode --------------------

  assert(
    runtimeRoute.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "runtime route must check BOTOMATIC_BETA_AUTH_TOKEN to decide whether to proxy to Railway",
  );
  assert(
    runtimeRoute.includes("x-user-id"),
    "runtime route must inject x-user-id actor header when proxying to Railway in beta mode",
  );
  assert(
    runtimeRoute.includes("x-tenant-id"),
    "runtime route must inject x-tenant-id actor header when proxying to Railway in beta mode",
  );
  assert(
    runtimeRoute.includes("x-role"),
    "runtime route must inject x-role header when proxying to Railway in beta mode",
  );
  assert(
    runtimeRoute.includes("requireControlPlaneProjectAccess"),
    "runtime route must still call requireControlPlaneProjectAccess for local auth",
  );

  // --- 4. build/start route forwards BOTOMATIC_BETA_AUTH_TOKEN to Railway ----

  assert(
    buildStart.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "build/start route must use BOTOMATIC_BETA_AUTH_TOKEN for outbound Railway authorization",
  );
  assert(
    buildStart.includes("x-user-id"),
    "build/start route must inject x-user-id actor header in outbound Railway call",
  );
  assert(
    buildStart.includes("x-tenant-id"),
    "build/start route must inject x-tenant-id actor header in outbound Railway call",
  );
  assert(
    buildStart.includes("requireControlPlaneProjectAccess"),
    "build/start route must call requireControlPlaneProjectAccess",
  );

  // --- 5. BOTOMATIC_BETA_AUTH_TOKEN must NOT appear in client-accessible code --

  const CLIENT_FILES = [
    "apps/control-plane/src/services/api.ts",
    "apps/control-plane/src/services/intake.ts",
    "apps/control-plane/src/components/beta-hq/BetaHQ.tsx",
  ];
  for (const rel of CLIENT_FILES) {
    if (!has(rel)) continue;
    assert(
      !read(rel).includes("BOTOMATIC_BETA_AUTH_TOKEN"),
      `${rel} must not reference BOTOMATIC_BETA_AUTH_TOKEN (server-side only — no NEXT_PUBLIC_ prefix)`,
    );
  }

  // The catch-all proxy IS server-side and correctly uses BOTOMATIC_BETA_AUTH_TOKEN.
  assert(
    catchAllProxy.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "Catch-all proxy must inject BOTOMATIC_BETA_AUTH_TOKEN for Railway-bound requests",
  );

  // --- 6. Launcher must set all env vars consumed by route handlers -----------

  const ROUTE_HANDLER_ENV_VARS = [
    "BOTOMATIC_BETA_AUTH_TOKEN",
    "BOTOMATIC_BETA_USER_ID",
    "BOTOMATIC_BETA_TENANT_ID",
    "BOTOMATIC_API_BASE_URL",
    "NEXT_PUBLIC_API_BASE_URL",
    "BOTOMATIC_BETA_BASE_URL",
  ];
  for (const envVar of ROUTE_HANDLER_ENV_VARS) {
    assert(
      launchFull.includes(envVar),
      `launchBetaFull.ps1 must set ${envVar} (read by local route handlers and Railway proxy)`,
    );
  }

  console.log("betaBuildFlowAuth.test.ts passed");
}

run();
