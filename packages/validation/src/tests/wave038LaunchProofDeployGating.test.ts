import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// required files
for (const rel of [
  "apps/control-plane/src/server/launchProofStore.ts",
  "apps/control-plane/src/services/launchProof.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts",
]) {
  assert(exists(rel), `missing ${rel}`);
}

const verifyRoute = read("apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts");
assert(verifyRoute.includes("idempotencyKey is required"));
assert(!verifyRoute.includes("derivedPreviewUrl"));

const deployRoute = read("apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts");
assert(deployRoute.includes("launch_proof_required"));

const rollbackRoute = read("apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts");
assert(rollbackRoute.includes("deployment_record_required"));

const pkg = read("package.json");
assert(pkg.includes("test:wave-025"));
assert(pkg.includes("test:wave-037"));

console.log("WAVE-038 checks passed");
