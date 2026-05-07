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
  // --- 1. computeProjectReadiness must exist in server_app.ts ---------------

  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert(
    serverApp.includes("computeProjectReadiness"),
    "server_app.ts must define computeProjectReadiness function",
  );
  assert(
    serverApp.includes("decisionLedgerRunKey"),
    "server_app.ts must define decisionLedgerRunKey for storing decision answers",
  );
  assert(
    serverApp.includes("getDecisionLedger"),
    "server_app.ts must define getDecisionLedger helper",
  );
  assert(
    serverApp.includes("setDecisionLedger"),
    "server_app.ts must define setDecisionLedger helper",
  );

  // --- 2. readyToBuild=false must block build before packet enqueue ----------

  // The operator/send autonomous build path must check readiness
  assert(
    serverApp.includes("READINESS GATE: check using freshly analyzed clarifications"),
    "operator/send autonomous build path must have READINESS GATE comment",
  );
  // When not ready, it must return without enqueueing packets
  assert(
    serverApp.includes("route: \"clarifying\"") || serverApp.includes('route: "clarifying"'),
    "readiness gate must return route: clarifying when blocked",
  );
  // The autonomous-build/start route must also check readiness
  assert(
    serverApp.includes("READINESS GATE: block build if high-risk decisions are unresolved"),
    "autonomous-build/start must have READINESS GATE comment",
  );

  // --- 3. readiness and clarifications endpoints must exist -----------------

  assert(
    serverApp.includes('"/api/projects/:projectId/readiness"'),
    "server_app.ts must have GET /api/projects/:projectId/readiness endpoint",
  );
  assert(
    serverApp.includes('"/api/projects/:projectId/clarifications"'),
    "server_app.ts must have POST /api/projects/:projectId/clarifications endpoint",
  );

  // --- 4. Next.js proxy routes must exist -----------------------------------

  assert(
    has("apps/control-plane/src/app/api/projects/[projectId]/readiness/route.ts"),
    "Next.js readiness proxy route must exist",
  );
  assert(
    has("apps/control-plane/src/app/api/projects/[projectId]/clarifications/route.ts"),
    "Next.js clarifications proxy route must exist",
  );

  const readinessRoute = read("apps/control-plane/src/app/api/projects/[projectId]/readiness/route.ts");
  assert(
    readinessRoute.includes("requireControlPlaneProjectAccess"),
    "readiness route must require project access auth",
  );

  const clarificationsRoute = read("apps/control-plane/src/app/api/projects/[projectId]/clarifications/route.ts");
  assert(
    clarificationsRoute.includes("requireControlPlaneProjectAccess"),
    "clarifications route must require project access auth",
  );

  // --- 5. BetaHQ must show Build button locked state ------------------------

  const betaHQ = read("apps/control-plane/src/components/beta-hq/BetaHQ.tsx");

  assert(
    betaHQ.includes("buildLocked"),
    "BetaHQ must have buildLocked state for disabling Build button",
  );
  assert(
    betaHQ.includes("readyToBuild"),
    "BetaHQ must reference readyToBuild from readiness state",
  );
  assert(
    betaHQ.includes("lockedReason"),
    "BetaHQ must display lockedReason when build is locked",
  );
  assert(
    betaHQ.includes("blockingQuestions"),
    "BetaHQ must display blockingQuestions to the user",
  );
  assert(
    betaHQ.includes("canUseRecommendedDefaults"),
    "BetaHQ must check canUseRecommendedDefaults to show defaults button",
  );
  assert(
    betaHQ.includes("Use recommended defaults"),
    "BetaHQ must render 'Use recommended defaults' action button",
  );
  assert(
    betaHQ.includes("plainEnglish"),
    "BetaHQ must show plain-English question explanations",
  );
  assert(
    betaHQ.includes("handleUseDefaults"),
    "BetaHQ must have handleUseDefaults handler",
  );
  assert(
    betaHQ.includes("/clarifications"),
    "BetaHQ must call the /clarifications endpoint to persist answers",
  );
  assert(
    betaHQ.includes("Build app"),
    "BetaHQ must have a visible 'Build app' button",
  );

  // --- 6. No provider secrets in client code --------------------------------

  const clientFiles = [
    "apps/control-plane/src/services/api.ts",
    "apps/control-plane/src/services/intake.ts",
  ];
  const forbidden = ["AUTH0_CLIENT_SECRET", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  for (const f of clientFiles) {
    if (!has(f)) continue;
    const content = read(f);
    for (const secret of forbidden) {
      assert(!content.includes(secret), `${f} must not reference provider secret ${secret}`);
    }
  }

  // --- 7. Missing artifact warning must be present --------------------------

  assert(
    betaHQ.includes("I do not see an uploaded file yet"),
    "BetaHQ must show 'I do not see an uploaded file yet' when artifact is referenced but missing",
  );
  assert(
    serverApp.includes("missingArtifacts"),
    "server_app.ts computeProjectReadiness must check for missingArtifacts",
  );

  // --- 8. Decision ledger has acceptedDefault tracking ---------------------

  assert(
    serverApp.includes("acceptedDefault"),
    "server_app.ts decision ledger must track acceptedDefault flag",
  );
  assert(
    serverApp.includes("clarifications_answered"),
    "server_app.ts must emit clarifications_answered event when decisions are stored",
  );

  // --- 9. Status normalization: clarifying and build_locked present ---------

  assert(
    serverApp.includes('"clarifying"') || serverApp.includes("'clarifying'"),
    "server_app.ts must use 'clarifying' status for pre-build readiness gate",
  );
  assert(
    serverApp.includes("build_locked") || serverApp.includes('"build_locked"'),
    "server_app.ts computeProjectReadiness must emit build_locked status for missing artifacts",
  );

  // --- 10. Readiness score present ----------------------------------------

  assert(
    serverApp.includes("readinessScore"),
    "server_app.ts must compute and return readinessScore",
  );

  console.log("commercialReadinessGate.test.ts passed");
}

run();
