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
  // --- 1. Hosted UI routes must exist ----------------------------------------

  assert(
    has("apps/control-plane/src/app/page.tsx"),
    "apps/control-plane/src/app/page.tsx must exist (root route renders BetaHQ)",
  );
  assert(
    has("apps/control-plane/src/app/projects/[projectId]/page.tsx"),
    "apps/control-plane/src/app/projects/[projectId]/page.tsx must exist",
  );
  assert(
    has("apps/control-plane/src/app/login/page.tsx"),
    "apps/control-plane/src/app/login/page.tsx must exist",
  );

  const rootPage = read("apps/control-plane/src/app/page.tsx");
  assert(
    rootPage.includes("BetaHQ"),
    "Root page.tsx must render BetaHQ component",
  );

  const projectPage = read("apps/control-plane/src/app/projects/[projectId]/page.tsx");
  assert(
    projectPage.includes("BetaHQ"),
    "Project page.tsx must render BetaHQ component",
  );

  // --- 2. Middleware uses server-only password (no NEXT_PUBLIC_) --------------

  assert(
    has("apps/control-plane/src/middleware.ts"),
    "apps/control-plane/src/middleware.ts must exist",
  );
  const middleware = read("apps/control-plane/src/middleware.ts");
  assert(
    middleware.includes("BOTOMATIC_UI_PASSWORD"),
    "middleware.ts must gate routes using BOTOMATIC_UI_PASSWORD",
  );
  assert(
    !middleware.includes("NEXT_PUBLIC_BOTOMATIC_UI_PASSWORD"),
    "middleware.ts must NOT use NEXT_PUBLIC_ prefix for BOTOMATIC_UI_PASSWORD — it must remain server-only",
  );

  // --- 3. Commercial start script and Railway config -------------------------

  assert(
    has("scripts/start-commercial.sh"),
    "scripts/start-commercial.sh must exist for Railway dual-process start",
  );
  const startScript = read("scripts/start-commercial.sh");
  assert(
    startScript.includes("PORT=3001"),
    "start-commercial.sh must launch orchestrator API on port 3001",
  );
  assert(
    startScript.includes("apps/orchestrator-api/src/bootstrap.ts"),
    "start-commercial.sh must start the orchestrator API process",
  );
  assert(
    startScript.includes("control-plane"),
    "start-commercial.sh must start the Next.js control-plane process",
  );

  const pkgJson = JSON.parse(read("package.json"));
  assert(
    typeof pkgJson.scripts?.["start:commercial"] === "string",
    'package.json must have a "start:commercial" script',
  );

  assert(
    has("railway.json"),
    "railway.json must exist",
  );
  const railwayJson = JSON.parse(read("railway.json"));
  const startCmd: string = railwayJson?.deploy?.startCommand ?? "";
  assert(
    startCmd.includes("commercial"),
    `railway.json deploy.startCommand must reference commercial start (got: "${startCmd}")`,
  );

  const railwayHealthPath: string = railwayJson?.deploy?.healthcheckPath ?? "";
  assert(
    railwayHealthPath.startsWith("/api/"),
    `railway.json healthcheckPath must route through Next.js proxy (/api/*), got: "${railwayHealthPath}"`,
  );

  // --- 4. Commercial auth bypass in projectAccess (server-only) --------------

  const projectAccess = read("apps/control-plane/src/server/projectAccess.ts");
  assert(
    projectAccess.includes("BOTOMATIC_API_TOKEN"),
    "projectAccess.ts must have BOTOMATIC_API_TOKEN commercial bypass",
  );
  assert(
    !projectAccess.includes("NEXT_PUBLIC_BOTOMATIC_API_TOKEN"),
    "projectAccess.ts must NOT reference NEXT_PUBLIC_BOTOMATIC_API_TOKEN — token must stay server-only",
  );

  // --- 5. No provider secrets in client-accessible files ---------------------

  const clientFiles = [
    "apps/control-plane/src/services/api.ts",
    "apps/control-plane/src/services/intake.ts",
  ];
  const forbiddenInClient = [
    "AUTH0_CLIENT_SECRET",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_AI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const clientFile of clientFiles) {
    if (!has(clientFile)) continue;
    const content = read(clientFile);
    for (const forbidden of forbiddenInClient) {
      assert(
        !content.includes(forbidden),
        `${clientFile} must not reference provider secret "${forbidden}" — provider keys must stay server-side`,
      );
    }
  }

  // --- 6. Upload and build routes remain wired (not regressed) ---------------

  const intakeFileRoute = "apps/control-plane/src/app/api/projects/[projectId]/intake/file/route.ts";
  assert(
    has(intakeFileRoute),
    `Dedicated intake/file upload route must still exist at ${intakeFileRoute}`,
  );

  const buildStart = read("apps/control-plane/src/app/api/projects/[projectId]/build/start/route.ts");
  assert(
    buildStart.includes("artifactIds"),
    "build/start route must still forward artifactIds (upload→build wiring not regressed)",
  );

  // --- 7. Deployment docs exist ----------------------------------------------

  assert(
    has("docs/beta/HOSTED_COMMERCIAL_LAUNCH.md"),
    "docs/beta/HOSTED_COMMERCIAL_LAUNCH.md must exist",
  );
  const launchDocs = read("docs/beta/HOSTED_COMMERCIAL_LAUNCH.md");
  assert(
    launchDocs.includes("BOTOMATIC_UI_PASSWORD"),
    "HOSTED_COMMERCIAL_LAUNCH.md must document BOTOMATIC_UI_PASSWORD env var",
  );
  assert(
    launchDocs.includes("BOTOMATIC_API_TOKEN"),
    "HOSTED_COMMERCIAL_LAUNCH.md must document BOTOMATIC_API_TOKEN env var",
  );
  assert(
    launchDocs.includes("start:commercial"),
    "HOSTED_COMMERCIAL_LAUNCH.md must reference the start:commercial deploy command",
  );

  console.log("hostedCommercialLaunch.test.ts passed");
}

run();
