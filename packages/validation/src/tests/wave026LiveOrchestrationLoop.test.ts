import assert from "assert";
import fs from "fs";

const apiSource = fs.readFileSync("apps/control-plane/src/services/api.ts", "utf8");
const orchestrationSource = fs.readFileSync("apps/control-plane/src/services/orchestration.ts", "utf8");
const vibeDashboardSource = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const orchestrationPanelSource = fs.readFileSync("apps/control-plane/src/components/builder/VibeOrchestrationPanel.tsx", "utf8");
const proDashboardSource = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");

assert(apiSource.includes("postJsonSafe<TResponse, TBody>"), "api client must include postJsonSafe");
assert(orchestrationSource.includes("submitVibeIntake"), "orchestration service must define submitVibeIntake");
assert(orchestrationSource.includes("postJsonSafe"), "submitVibeIntake must use postJsonSafe");
assert(vibeDashboardSource.includes("VibeOrchestrationPanel"), "Vibe dashboard must render live orchestration panel");

const requiredFallbacks = [
  "No orchestration started",
  "Orchestration unavailable",
  "Execution status unavailable",
];
for (const text of requiredFallbacks) {
  assert(orchestrationPanelSource.includes(text) || orchestrationSource.includes(text), `must include fallback string: ${text}`);
}

const forbiddenDecorativeDefaults = ["Design", "Features", "Testing", "Launch"];
for (const text of forbiddenDecorativeDefaults) {
  assert(!vibeDashboardSource.includes(`<span className=\"is-active\">${text}</span>`), `must not include decorative active stage: ${text}`);
}

assert(proDashboardSource.includes("No build started"), "Pro dashboard must keep truthful fallback");

console.log("wave026LiveOrchestrationLoop.test.ts passed");
