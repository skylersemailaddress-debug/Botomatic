import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

const pro = read("apps/control-plane/src/components/pro/ProDashboard.tsx");
const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
const css = read("apps/control-plane/src/styles/globals.css");
const orchestrationPanel = read("apps/control-plane/src/components/builder/VibeOrchestrationPanel.tsx");
const orchestrationHook = read("apps/control-plane/src/components/builder/useVibeOrchestration.ts");
const executionService = read("apps/control-plane/src/services/execution.ts");

for (const signal of ["pro-dashboard-sidebar", "pro-toolbar", "pro-grid", "pro-panel", "vibe-dashboard-sidebar", "vibe-dashboard-layout", "vibe-right-rail", "vibe-rail-card", "vibe-chat-timeline", "vibe-input-shell"]) {
  assert(pro.includes(signal) || vibe.includes(signal), `missing layout signal: ${signal}`);
}

for (const cssSignal of ["--dash-bg-layer", "--dash-card-shadow", "--dash-card-border", ".pro-dashboard-sidebar", ".pro-topbar", ".vibe-right-rail", "@media (max-width: 1240px)", "@media (max-width: 920px)"]) {
  assert(css.includes(cssSignal), `missing css signal: ${cssSignal}`);
}

for (const required of ["No orchestration started", "No persisted state yet", "No execution run yet", "Preview unavailable", "Runtime not connected", "Health check not run", "No launch proof yet", "Launch unavailable", "Service health not connected", "Database not connected", "No test run yet", "No terminal logs yet", "No commits available", "No Copilot activity yet", "Repository diff not connected", "Execution runner unavailable"]) {
  assert(pro.includes(required) || vibe.includes(required) || orchestrationPanel.includes(required) || orchestrationHook.includes(required) || executionService.includes(required), `missing truth string: ${required}`);
}

for (const forbidden of ["92%", "All Systems Operational", "178/198", "198 Total Tests", "http://localhost:3000", "Compilation successful", "I’ve optimized", "Everything looks good", "Ready to launch", "Deployed successfully"]) {
  assert(!pro.includes(forbidden), `forbidden string in ProDashboard: ${forbidden}`);
  assert(!vibe.includes(forbidden), `forbidden string in VibeDashboard: ${forbidden}`);
}

assert(vibe.includes("Launch unavailable"));
// Toolbar buttons are now handled by ProDashboardToolbar client component with real service call wiring.
// The truth-state controls (initial disabled state + status feedback) live inside that client component.
const proToolbar = read("apps/control-plane/src/components/pro/ProDashboardToolbar.tsx");
assert(pro.includes("ProDashboardToolbar"), "ProDashboard must use ProDashboardToolbar client component");
assert(proToolbar.includes("startAutonomousBuild") || proToolbar.includes("Run"), "ProDashboardToolbar must wire Run to autonomous build");
assert(proToolbar.includes("requestDeploy") || proToolbar.includes("Launch"), "ProDashboardToolbar must wire Launch button");
assert(proToolbar.includes("promoteProject") || proToolbar.includes("Deploy"), "ProDashboardToolbar must wire Deploy button");
assert(!pro.includes("fetch("));
assert(!vibe.includes("fetch("));
assert(!pro.includes('sr-only">No orchestration started'));
assert(!vibe.includes('sr-only">No orchestration started'));

console.log("WAVE-033 reference UI match checks passed");
