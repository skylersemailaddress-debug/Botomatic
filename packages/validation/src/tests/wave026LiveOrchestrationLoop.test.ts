import assert from "assert";
import fs from "fs";

const apiSource = fs.readFileSync("apps/control-plane/src/services/api.ts", "utf8");
const orchestrationSource = fs.readFileSync("apps/control-plane/src/services/orchestration.ts", "utf8");
const vibeDashboardSource = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const orchestrationHookSource = fs.readFileSync("apps/control-plane/src/components/builder/useVibeOrchestration.ts", "utf8");
const projectPageSource = fs.readFileSync("apps/control-plane/src/app/projects/[projectId]/page.tsx", "utf8");

assert(apiSource.includes("postJsonSafe<TResponse, TBody>"), "api client must include postJsonSafe");
assert(orchestrationSource.includes("submitVibeIntake"), "orchestration service must define submitVibeIntake");
assert(orchestrationSource.includes("getOrchestrationStatus"), "orchestration service must define getOrchestrationStatus");
assert(orchestrationSource.includes("postJsonSafe"), "submitVibeIntake must use postJsonSafe");
assert(projectPageSource.includes("BetaHQ"), "canonical project route must render BetaHQ");
assert(vibeDashboardSource.includes("useVibeOrchestration"), "main Vibe input must use orchestration controller");
assert(vibeDashboardSource.includes("orchestration.submitPrompt"), "main Vibe input must submit orchestration prompt");
assert(vibeDashboardSource.includes("Build Map"), "Vibe dashboard must render Build Map status surface");
assert(vibeDashboardSource.includes("graph.stages"), "Vibe dashboard Build Map must be backed by orchestration graph stages");

const requiredFallbacks = [
  "No orchestration started",
  "Planner unavailable",
  "Orchestration unavailable",
  "Execution status unavailable",
  "Stage state unavailable",
];
for (const text of requiredFallbacks) {
  assert(orchestrationSource.includes(text) || orchestrationHookSource.includes(text), `must include fallback string: ${text}`);
}

assert(!vibeDashboardSource.includes("Use the Build Map prompt to start real orchestration."), "must not redirect users away from main input");
assert(!vibeDashboardSource.includes('className="vibe-step-line"'), "must not include decorative static Build Map strip");
assert(!fs.existsSync("apps/control-plane/src/components/pro/ProDashboard.tsx"), "deleted legacy ProDashboard must not be required for the live orchestration loop");

console.log("wave026LiveOrchestrationLoop.test.ts passed");
