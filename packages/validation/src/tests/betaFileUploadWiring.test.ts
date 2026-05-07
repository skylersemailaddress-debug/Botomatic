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
  // --- 1. Dedicated intake/file local route must exist -----------------------

  const intakeFileRoutePath = "apps/control-plane/src/app/api/projects/[projectId]/intake/file/route.ts";
  assert(has(intakeFileRoutePath), `Dedicated local intake/file route must exist at ${intakeFileRoutePath}`);

  const intakeFileRoute = read(intakeFileRoutePath);

  assert(
    intakeFileRoute.includes("requireControlPlaneProjectAccess"),
    "intake/file route must call requireControlPlaneProjectAccess for local auth",
  );
  assert(
    intakeFileRoute.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "intake/file route must inject BOTOMATIC_BETA_AUTH_TOKEN when proxying to Railway",
  );
  assert(
    intakeFileRoute.includes("x-user-id"),
    "intake/file route must inject x-user-id actor header when proxying to Railway",
  );
  assert(
    intakeFileRoute.includes("x-tenant-id"),
    "intake/file route must inject x-tenant-id actor header when proxying to Railway",
  );
  assert(
    intakeFileRoute.includes("x-role"),
    "intake/file route must inject x-role header when proxying to Railway",
  );
  assert(
    intakeFileRoute.includes("arrayBuffer"),
    "intake/file route must forward body as arrayBuffer to preserve multipart/form-data",
  );
  assert(
    intakeFileRoute.includes("intake/file"),
    "intake/file route must forward to /intake/file on the backend",
  );

  // --- 2. BetaHQ must track attachedArtifacts and include IDs in build/start -

  const betaHQ = read("apps/control-plane/src/components/beta-hq/BetaHQ.tsx");

  assert(
    betaHQ.includes("attachedArtifacts"),
    "BetaHQ.tsx must declare attachedArtifacts state for tracking uploaded artifact IDs",
  );
  assert(
    betaHQ.includes("setAttachedArtifacts"),
    "BetaHQ.tsx must call setAttachedArtifacts after a successful upload",
  );
  assert(
    betaHQ.includes("artifactIds: attachedArtifacts.map"),
    "BetaHQ.tsx must include artifactIds mapped from attachedArtifacts in the build/start payload",
  );
  assert(
    betaHQ.includes("Attached to next build"),
    "BetaHQ.tsx must render an 'Attached to next build' section listing confirmed artifacts",
  );

  // --- 3. build/start route must validate and forward artifactIds ------------

  const buildStart = read("apps/control-plane/src/app/api/projects/[projectId]/build/start/route.ts");

  assert(
    buildStart.includes("artifactIds"),
    "build/start route must explicitly handle artifactIds field",
  );
  assert(
    buildStart.includes("Array.isArray(inputBody.artifactIds)"),
    "build/start route must validate artifactIds with Array.isArray before forwarding",
  );
  assert(
    buildStart.includes("{ ...inputBody, artifactIds }"),
    "build/start route must spread artifactIds into the outbound Railway body",
  );

  // --- 4. BOTOMATIC_BETA_AUTH_TOKEN must NOT appear in intake.ts client file -

  if (has("apps/control-plane/src/services/intake.ts")) {
    assert(
      !read("apps/control-plane/src/services/intake.ts").includes("BOTOMATIC_BETA_AUTH_TOKEN"),
      "services/intake.ts must not reference BOTOMATIC_BETA_AUTH_TOKEN (server-side only)",
    );
  }

  console.log("betaFileUploadWiring.test.ts passed");
}

run();
