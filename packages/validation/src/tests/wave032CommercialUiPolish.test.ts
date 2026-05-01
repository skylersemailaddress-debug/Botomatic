import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

const pro = read("apps/control-plane/src/components/pro/ProDashboard.tsx");
const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
const shell = read("apps/control-plane/src/components/project/ProjectWorkspaceShell.tsx");
const orchestrationPanel = read("apps/control-plane/src/components/builder/VibeOrchestrationPanel.tsx");
const orchestrationHook = read("apps/control-plane/src/components/builder/useVibeOrchestration.ts");
const css = read("apps/control-plane/src/styles/globals.css");

for (const signal of ["Pro Mode", "Vibe Mode", "Botomatic", "Build Pipeline", "System Health", "Code Changes", "Live Application", "AI Copilot", "Build Map", "What's Next", "One-Click Launch"]) {
  assert(pro.includes(signal) || vibe.includes(signal) || shell.includes(signal), `missing signal: ${signal}`);
}

for (const forbidden of ["92%", "All Systems Operational", "178/198", "198 Total Tests", "http://localhost:3000", "Compilation successful", "I’ve optimized"]) {
  assert(!pro.includes(forbidden));
  assert(!vibe.includes(forbidden));
}

for (const required of ["No orchestration started", "No persisted state yet", "No execution run yet", "Preview unavailable", "Runtime not connected", "Health check not run", "No launch proof yet", "Launch unavailable"]) {
  assert(pro.includes(required) || vibe.includes(required) || orchestrationPanel.includes(required) || orchestrationHook.includes(required), `missing truth string: ${required}`);
}

assert(!pro.includes('sr-only">No orchestration started'));
assert(!vibe.includes('sr-only">No orchestration started'));
assert(css.includes("@media (max-width: 1240px)") && css.includes("@media (max-width: 920px)"));
assert(css.includes(".vibe-empty-state") || css.includes(".pro-empty-state"));
assert(css.includes(".status-badge") || css.includes("--dash-card-shadow"));

console.log("WAVE-032 commercial UI polish checks passed");
