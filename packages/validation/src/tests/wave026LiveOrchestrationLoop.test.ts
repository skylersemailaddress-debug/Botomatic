import assert from "assert";
import fs from "fs";

const apiSource = fs.readFileSync("apps/control-plane/src/services/api.ts", "utf8");
const orchestrationSource = fs.readFileSync("apps/control-plane/src/services/orchestration.ts", "utf8");
const vibeDashboardSource = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const orchestrationPanelSource = fs.readFileSync("apps/control-plane/src/components/builder/VibeOrchestrationPanel.tsx", "utf8");
const orchestrationHookSource = fs.readFileSync("apps/control-plane/src/components/builder/useVibeOrchestration.ts", "utf8");
const proDashboardSource = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");

assert(apiSource.includes("postJsonSafe<TResponse, TBody>"), "api client must include postJsonSafe");
assert(orchestrationSource.includes("submitVibeIntake"), "orchestration service must define submitVibeIntake");
assert(orchestrationSource.includes("getOrchestrationStatus"), "orchestration service must define getOrchestrationStatus");
assert(orchestrationSource.includes("postJsonSafe"), "submitVibeIntake must use postJsonSafe");
assert(vibeDashboardSource.includes("useVibeOrchestration"), "main Vibe input must use orchestration controller");
assert(vibeDashboardSource.includes("orchestration.submitPrompt"), "main Vibe input must submit orchestration prompt");
assert(vibeDashboardSource.includes("VibeOrchestrationPanel"), "Vibe dashboard must render Build Map status panel");

const requiredFallbacks = [
  "No orchestration started",
  "Planner unavailable",
  "Orchestration unavailable",
  "Execution status unavailable",
  "Stage state unavailable",
];
for (const text of requiredFallbacks) {
  assert(orchestrationPanelSource.includes(text) || orchestrationSource.includes(text) || orchestrationHookSource.includes(text), `must include fallback string: ${text}`);
}

assert(!vibeDashboardSource.includes("Use the Build Map prompt to start real orchestration."), "must not redirect users away from main input");
assert(!vibeDashboardSource.includes('className="vibe-step-line"'), "must not include decorative static Build Map strip");
assert(proDashboardSource.includes("No build started"), "Pro dashboard must keep truthful fallback");

console.log("wave026LiveOrchestrationLoop.test.ts passed");
