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

// Provider secrets that must NOT appear in control-plane client/shared code.
const PROVIDER_SECRETS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GITHUB_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
];

// Client-accessible files that must not reference provider secrets.
const CLIENT_FILES = [
  "apps/control-plane/src/components/beta-hq/BetaHQ.tsx",
  "apps/control-plane/src/services/api.ts",
  "apps/control-plane/src/services/intake.ts",
];

function run() {
  // 1. Full launch script must exist.
  assert(has("scripts/launchBetaFull.ps1"), "scripts/launchBetaFull.ps1 must exist");

  const full = read("scripts/launchBetaFull.ps1");

  // 2. Must reject placeholder values.
  const PLACEHOLDERS = ["YOUR_", "PASTE_", "REPLACE_", "changeme", "placeholder"];
  for (const p of PLACEHOLDERS) {
    assert(full.includes(`"${p}"`), `launchBetaFull.ps1 must reject placeholder pattern: "${p}"`);
  }

  // 3. Must validate JWT format.
  assert(full.includes("eyJ"), "launchBetaFull.ps1 must validate token starts with eyJ");

  // 4. Must NOT hardcode client_secret.
  assert(
    !full.includes("client_secret = \""),
    "launchBetaFull.ps1 must not hardcode a client_secret string literal",
  );

  // 5. Must check /api/ops/metrics (protected route).
  assert(full.includes("ops/metrics"), "launchBetaFull.ps1 must check /api/ops/metrics");

  // 6. Must support -CheckOnly flag.
  assert(
    full.includes("CheckOnly") || full.includes("check-only") || full.includes("check_only"),
    "launchBetaFull.ps1 must support a CheckOnly / check-only flag",
  );

  // 7. Must print GO / NO-GO.
  assert(full.includes("GO"), "launchBetaFull.ps1 must print GO / NO-GO summary");

  // 8. package.json must define all three launch scripts.
  const pkg = read("package.json");
  assert(pkg.includes('"launch:beta:full"'), 'package.json must define "launch:beta:full"');
  assert(pkg.includes('"launch:beta:full:check"'), 'package.json must define "launch:beta:full:check"');
  assert(pkg.includes("launchBetaFull.ps1"), 'package.json launch scripts must reference launchBetaFull.ps1');

  // 9. build/start local route must exist.
  const buildStartPath = "apps/control-plane/src/app/api/projects/[projectId]/build/start/route.ts";
  assert(has(buildStartPath), `${buildStartPath} must exist`);

  const buildRoute = read(buildStartPath);

  // 10. build/start route must call requireControlPlaneProjectAccess.
  assert(
    buildRoute.includes("requireControlPlaneProjectAccess"),
    "build/start route must call requireControlPlaneProjectAccess",
  );

  // 11. build/start route must forward to autonomous-build/start.
  assert(
    buildRoute.includes("autonomous-build/start"),
    "build/start route must proxy to autonomous-build/start on Railway",
  );

  // 12. BetaHQ must call /build/start after intake.
  const betaHQ = read("apps/control-plane/src/components/beta-hq/BetaHQ.tsx");
  assert(
    betaHQ.includes("/build/start"),
    "BetaHQ must call /api/projects/:projectId/build/start after intake",
  );

  // 13. BetaHQ must handle build/start failure messages clearly (no fake success).
  assert(
    betaHQ.includes("executor unavailable") || betaHQ.includes("Build trigger endpoint"),
    "BetaHQ must handle build/start failure with clear error messages",
  );

  // 14. No provider secrets in control-plane client files.
  for (const rel of CLIENT_FILES) {
    if (!has(rel)) continue;
    const content = read(rel);
    for (const secret of PROVIDER_SECRETS) {
      assert(
        !content.includes(secret),
        `${rel} must not reference provider secret: ${secret} (keep in Railway, not local)`,
      );
    }
  }

  console.log("betaFullLaunchReadiness.test.ts passed");
}

run();
