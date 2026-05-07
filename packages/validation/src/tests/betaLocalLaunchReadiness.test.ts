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
  // 1. Launcher script must exist.
  assert(has("scripts/launchBetaLocal.ps1"), "scripts/launchBetaLocal.ps1 must exist");

  const script = read("scripts/launchBetaLocal.ps1");

  // 2. Script must read secrets from the external file (never hardcode).
  assert(
    script.includes("beta-launch.env"),
    "launchBetaLocal.ps1 must read secrets from beta-launch.env (not hardcoded)",
  );

  // 3. Script must reject placeholder values.
  const PLACEHOLDERS = ["YOUR_", "PASTE_", "REPLACE_", "changeme", "placeholder"];
  for (const p of PLACEHOLDERS) {
    assert(
      script.includes(`"${p}"`),
      `launchBetaLocal.ps1 must reject placeholder pattern: "${p}"`,
    );
  }

  // 4. Script must validate JWT format.
  assert(
    script.includes("eyJ"),
    "launchBetaLocal.ps1 must validate token starts with eyJ",
  );

  // 5. Script must NOT contain a hardcoded client_secret value.
  //    The secret is referenced by key name only, never as a literal.
  assert(
    !script.includes("client_secret = \""),
    "launchBetaLocal.ps1 must not hardcode a client_secret string literal",
  );

  // 6. Script must set BOTOMATIC_BETA_AUTH_TOKEN from the fetched token.
  assert(
    script.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "launchBetaLocal.ps1 must set BOTOMATIC_BETA_AUTH_TOKEN",
  );

  // 7. Script must clear local dev ports.
  assert(
    script.includes("3000") && script.includes("3001") && script.includes("4000"),
    "launchBetaLocal.ps1 must clear ports 3000, 3001, 4000",
  );

  // 8. Script must clear Next.js cache.
  assert(
    script.includes(".next"),
    "launchBetaLocal.ps1 must clear the Next.js cache",
  );

  // 9. Script must health-check the hosted API.
  assert(
    script.includes("health") && script.includes("ready"),
    "launchBetaLocal.ps1 must health-check /api/health and /api/ready",
  );

  // 10. Script must start the UI dev server.
  assert(
    script.includes("ui:dev"),
    "launchBetaLocal.ps1 must start npm run ui:dev",
  );

  // 11. package.json must define the launch:beta:local script.
  const pkg = read("package.json");
  assert(
    pkg.includes('"launch:beta:local"'),
    'package.json must define "launch:beta:local" script',
  );
  assert(
    pkg.includes("launchBetaLocal.ps1"),
    'package.json launch:beta:local must reference launchBetaLocal.ps1',
  );

  // 12. Documentation must exist.
  assert(has("docs/beta/LOCAL_BETA_LAUNCH.md"), "docs/beta/LOCAL_BETA_LAUNCH.md must exist");
  const doc = read("docs/beta/LOCAL_BETA_LAUNCH.md");
  assert(
    doc.includes("beta-launch.env"),
    "LOCAL_BETA_LAUNCH.md must document the secrets file path",
  );
  assert(
    doc.includes("AUTH0_SMOKE_CLIENT_SECRET"),
    "LOCAL_BETA_LAUNCH.md must document required AUTH0_SMOKE_CLIENT_SECRET key",
  );
  assert(
    doc.toLowerCase().includes("never commit"),
    "LOCAL_BETA_LAUNCH.md must warn against committing secrets",
  );

  console.log("betaLocalLaunchReadiness.test.ts passed");
}

run();
