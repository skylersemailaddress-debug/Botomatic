import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// Evidence doc
assert(exists("release-evidence/rc/WAVE-041_PIXEL_EXACT_REFERENCE_UI_FINAL.md"));

// UI files must exist
const proFile = "apps/control-plane/src/components/pro/ProDashboard.tsx";
const vibeFile = "apps/control-plane/src/components/vibe/VibeDashboard.tsx";

assert(exists(proFile));
assert(exists(vibeFile));

const pro = read(proFile);
const vibe = read(vibeFile);

// Required structural signals
assert(pro.includes("pro-grid"));
assert(pro.includes("pro-panel"));
assert(pro.includes("pro-toolbar"));

assert(vibe.includes("vibe-dashboard-layout"));
assert(vibe.includes("vibe-chat-timeline"));
assert(vibe.includes("vibe-input-shell"));
assert(vibe.includes("vibe-right-rail"));

// Truth-state strings must remain
for (const truth of [
  "Preview unavailable",
  "Runtime not connected",
  "No launch proof yet",
  "Launch unavailable"
]) {
  assert(pro.includes(truth) || vibe.includes(truth));
}

// Forbidden fake strings
for (const bad of [
  "92%",
  "All Systems Operational",
  "Ready to launch",
  "Deploy successful",
  "Deployed successfully",
  "http://localhost:3000"
]) {
  assert(!pro.includes(bad), `Pro contains forbidden string: ${bad}`);
  assert(!vibe.includes(bad), `Vibe contains forbidden string: ${bad}`);
}

// Launch must remain gated
assert(vibe.includes("Launch unavailable"));

// Scripts include all waves
const pkg = read("package.json");
for (let i = 25; i <= 40; i++) {
  assert(pkg.includes(`test:wave-0${i}`));
}

console.log("WAVE-041 checks passed");
