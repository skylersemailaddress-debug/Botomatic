import assert from "assert";
import fs from "fs";

const projectStateSource = fs.readFileSync("apps/control-plane/src/services/projectState.ts", "utf8");
const orchestrationHookSource = fs.readFileSync("apps/control-plane/src/components/builder/useVibeOrchestration.ts", "utf8");
const vibeDashboardSource = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const orchestrationSource = fs.readFileSync("apps/control-plane/src/services/orchestration.ts", "utf8");
const proDashboardSource = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");

assert(projectStateSource.includes("export async function getProjectState"), "projectState service must include getProjectState");
assert(projectStateSource.includes("export async function getProjectResume"), "projectState service must include getProjectResume");

const resumeFallbackOrder = [
  "/api/projects/${encodeURIComponent(projectId)}/resume",
  "/api/projects/${encodeURIComponent(projectId)}/state",
  "/api/projects/${encodeURIComponent(projectId)}/status",
  "/api/projects/${encodeURIComponent(projectId)}/ui/overview",
];
for (const endpoint of resumeFallbackOrder) {
  assert(projectStateSource.includes(endpoint), `resume fallback must include ${endpoint}`);
}

assert(orchestrationHookSource.includes("getProjectResume(projectId)"), "useVibeOrchestration must call getProjectResume on mount");
assert(projectStateSource.includes('message: "No persisted state yet"'), "empty resume must map to No persisted state yet");
assert(projectStateSource.includes('message: "Resume unavailable"'), "resume unavailable message must still exist for real failures");
assert(orchestrationHookSource.includes('result.state === "empty" || result.status === 404'), "hook must treat empty resume distinctly from unavailable failure");
assert(orchestrationHookSource.includes('setPrompt((currentPrompt) => currentPrompt || result.data.latestPrompt || "")'), "hook must avoid overwriting user prompt during late resume hydration");
assert(vibeDashboardSource.includes('orchestration.resumeState === "unavailable"'), "project state unavailable UI should be driven by resume state flag");

const truthfulFallbacks = [
  "No persisted state yet",
  "No objective saved",
  "No next step saved",
  "No resumed run",
  "Project state unavailable",
  "Resume unavailable",
];
for (const text of truthfulFallbacks) {
  assert(vibeDashboardSource.includes(text) || orchestrationHookSource.includes(text) || projectStateSource.includes(text), `must include truthful fallback: ${text}`);
}

assert(orchestrationSource.includes("submitVibeIntake"), "submit flow must keep submitVibeIntake");
assert(orchestrationSource.includes("getOrchestrationStatus"), "WAVE-026 orchestration status function must remain");

const forbiddenStrings = ["92%", "All Systems Operational", "178/198 tests passed"];
for (const text of forbiddenStrings) {
  assert(!proDashboardSource.includes(text), `WAVE-025 fake string must remain absent: ${text}`);
}

console.log("wave027StatePersistenceResolution.test.ts passed");
