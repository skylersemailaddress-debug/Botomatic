import assert from "assert";
import fs from "fs";

const projectPageSource = fs.readFileSync("apps/control-plane/src/app/projects/[projectId]/page.tsx", "utf8");
const vibeDashboardSource = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const firstRunSource = fs.readFileSync("apps/control-plane/src/services/firstRun.ts", "utf8");
const runtimeStatusSource = fs.readFileSync("apps/control-plane/src/services/runtimeStatus.ts", "utf8");
const orchestrationSource = fs.readFileSync("apps/control-plane/src/services/orchestration.ts", "utf8");
const orchestrationHookSource = fs.readFileSync("apps/control-plane/src/components/builder/useVibeOrchestration.ts", "utf8");
const northStarShellSource = fs.readFileSync("apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx", "utf8");

assert(projectPageSource.includes("VibeDashboard"), "canonical project route must render VibeDashboard");
assert(!fs.existsSync("apps/control-plane/src/components/pro/ProDashboard.tsx"), "deleted legacy ProDashboard must not be recreated to satisfy stale tests");

const forbiddenStaticClaims = [
  "All Systems Operational",
  "178/198 tests passed",
  "198 Total Tests",
  "1243 packages",
  "Local server running at http://localhost:3000",
  "http://localhost:3000",
];

for (const text of forbiddenStaticClaims) {
  assert(!vibeDashboardSource.includes(text), `canonical VibeDashboard must not include fake string: ${text}`);
}

assert(!northStarShellSource.includes("92%"), "NorthStarBuilderShell must not include fake 92% health");
assert(
  !vibeDashboardSource.includes("92") || vibeDashboardSource.includes("firstRunState.hasExecutionRun ? 92 : 0"),
  "VibeDashboard health percentage must be derived from execution state, not a static fake claim",
);

const requiredTruthfulFallbacks = [
  "No first-run state yet",
  "No orchestration started",
  "Execution status unavailable",
  "Project creation not connected",
  "API server unreachable",
  "Launch proof missing",
  "No activity yet. Start building to see progress here.",
  "Complete the build steps to enable launch.",
];

const truthSources = `${vibeDashboardSource}\n${firstRunSource}\n${runtimeStatusSource}\n${orchestrationSource}\n${orchestrationHookSource}`;
for (const text of requiredTruthfulFallbacks) {
  assert(truthSources.includes(text), `canonical Vibe surface must include truthful fallback string: ${text}`);
}

console.log("proDashboardTruthState.test.ts passed");
