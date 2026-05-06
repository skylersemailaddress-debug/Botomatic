import assert from "assert";
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function run() {
  // 1. projectAccess.ts must contain the beta admin bypass keyed on BOTOMATIC_BETA_AUTH_TOKEN.
  const projectAccess = read("apps/control-plane/src/server/projectAccess.ts");
  assert(
    projectAccess.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "projectAccess.ts must reference BOTOMATIC_BETA_AUTH_TOKEN for server-side beta admin bypass",
  );
  assert(
    projectAccess.includes("role: \"admin\""),
    "projectAccess.ts beta bypass must return admin role",
  );
  assert(
    projectAccess.includes("BOTOMATIC_BETA_USER_ID"),
    "projectAccess.ts beta bypass must use BOTOMATIC_BETA_USER_ID env var for actorId",
  );

  // 2. Admin role must bypass the owner registry check so Railway-created projects
  //    (not in the local owner file) are still accessible.
  assert(
    projectAccess.includes("actor.role === \"admin\""),
    "requireControlPlaneProjectAccess must short-circuit owner check for admin role",
  );

  // 3. All dedicated local project route handlers must call requireControlPlaneProjectAccess.
  const localRoutes = [
    "apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/execution/[runId]/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts",
    "apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts",
  ];
  for (const rel of localRoutes) {
    const content = read(rel);
    assert(
      content.includes("requireControlPlaneProjectAccess"),
      `${rel} must call requireControlPlaneProjectAccess (no route may silently skip actor auth)`,
    );
  }

  // 4. The catch-all proxy must NOT have path-based conditions that skip beta token injection.
  const proxy = read("apps/control-plane/src/app/api/[...path]/route.ts");
  assert(
    proxy.includes("BOTOMATIC_BETA_AUTH_TOKEN"),
    "Catch-all proxy must reference BOTOMATIC_BETA_AUTH_TOKEN",
  );
  assert(
    proxy.includes("x-user-id"),
    "Catch-all proxy must inject x-user-id actor header when beta token is present",
  );
  assert(
    proxy.includes("x-tenant-id"),
    "Catch-all proxy must inject x-tenant-id actor header when beta token is present",
  );
  // No path-specific guards that could exclude runtime/execution routes.
  assert(
    !proxy.includes("/runtime") && !proxy.includes("/execution"),
    "Catch-all proxy must not contain path-specific conditions that could exclude runtime or execution routes from auth injection",
  );

  console.log("betaProxyActorHeaderGuard.test.ts passed");
}

run();
