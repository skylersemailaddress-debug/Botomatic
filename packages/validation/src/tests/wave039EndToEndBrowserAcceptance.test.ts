import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// Evidence doc must exist
assert(exists("release-evidence/rc/WAVE-039_END_TO_END_BROWSER_ACCEPTANCE.md"));

// Required routes
for (const rel of [
  "apps/control-plane/src/app/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx",
  "apps/control-plane/src/app/projects/[projectId]/logs/page.tsx",
]) {
  assert(exists(rel), `missing ${rel}`);
}

// Required backend routes
for (const rel of [
  "apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/start/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/stop/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/logs/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts",
]) {
  assert(exists(rel), `missing ${rel}`);
}

// No forbidden fake strings in UI
const uiFiles = [
  "apps/control-plane/src/components/pro/ProDashboard.tsx",
  "apps/control-plane/src/components/vibe/VibeDashboard.tsx",
];

for (const file of uiFiles) {
  if (!exists(file)) continue;
  const content = read(file);
  for (const bad of [
    "Ready to launch",
    "Deploy successful",
    "Deployed successfully",
    "All Systems Operational",
    "92%",
    "http://localhost:3000",
  ]) {
    assert(!content.includes(bad), `${file} contains forbidden string: ${bad}`);
  }
}

// Ensure launchProof service uses safe helpers
const launchService = read("apps/control-plane/src/services/launchProof.ts");
assert(launchService.includes("getJsonSafe"));
assert(launchService.includes("postJsonSafe"));

// Ensure wave scripts still exist
const pkg = read("package.json");
for (let i = 25; i <= 38; i++) {
  assert(pkg.includes(`test:wave-0${i}`));
}

console.log("WAVE-039 checks passed");
