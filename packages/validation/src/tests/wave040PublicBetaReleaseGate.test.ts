import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// Must exist
assert(exists("release-evidence/rc/WAVE-040_PUBLIC_BETA_RELEASE_GATE.md"));

const report = read("release-evidence/rc/WAVE-040_PUBLIC_BETA_RELEASE_GATE.md");

// Required sections
for (const section of [
  "Executive verdict",
  "Evidence matrix",
  "Remaining blockers",
  "Public beta go/no-go checklist",
  "Private alpha recommendation",
  "Release risk table",
  "Final recommendation"
]) {
  assert(report.includes(section), `Missing section: ${section}`);
}

// Must NOT claim fake readiness
if (report.includes("PUBLIC BETA READY")) {
  assert(report.includes("manual") || report.includes("evidence"), "Public beta cannot be claimed without evidence");
}

// Prior evidence docs must exist
assert(exists("release-evidence/rc/WAVE-034_RELEASE_CANDIDATE_ACCEPTANCE_AUDIT.md"));
assert(exists("release-evidence/rc/WAVE-039_END_TO_END_BROWSER_ACCEPTANCE.md"));

// Required backend routes still exist
for (const rel of [
  "apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts",
  "apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts",
]) {
  assert(exists(rel), `missing ${rel}`);
}

// No fake UI strings
for (const file of [
  "apps/control-plane/src/components/pro/ProDashboard.tsx",
  "apps/control-plane/src/components/vibe/VibeDashboard.tsx"
]) {
  if (!exists(file)) continue;
  const content = read(file);
  for (const bad of [
    "Ready to launch",
    "Deploy successful",
    "Deployed successfully",
    "All Systems Operational",
    "92%"
  ]) {
    assert(!content.includes(bad), `${file} contains forbidden string: ${bad}`);
  }
}

// Launch/deploy must remain gated
const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
assert(vibe.includes("Launch unavailable"));

// Ensure wave scripts up to 039 exist
const pkg = read("package.json");
for (let i = 25; i <= 39; i++) {
  assert(pkg.includes(`test:wave-0${i}`));
}

console.log("WAVE-040 checks passed");
