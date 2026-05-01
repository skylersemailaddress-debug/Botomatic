import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

function assertValidPng(rel: string) {
  const full = path.join(root, rel);
  assert(exists(rel), `${rel} must exist`);
  const stat = fs.statSync(full);
  assert(stat.size > 0, `${rel} must not be empty`);
  const signature = fs.readFileSync(full).subarray(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(signature.equals(expected), `${rel} must be a valid PNG`);
}

// Evidence doc
assert(exists("release-evidence/rc/WAVE-041_PIXEL_EXACT_REFERENCE_UI_FINAL.md"));

// UI files must exist
const proFile = "apps/control-plane/src/components/pro/ProDashboard.tsx";
const vibeFile = "apps/control-plane/src/components/vibe/VibeDashboard.tsx";
const shellFile = "apps/control-plane/src/components/project/ProjectWorkspaceShell.tsx";
const previewSurfaceFile = "apps/control-plane/src/components/vibe/LiveUIBuilderPreviewSurface.tsx";

assert(exists(proFile));
assert(exists(vibeFile));
assert(exists(shellFile));
assert(exists(previewSurfaceFile));

assertValidPng("docs/reference-ui/vibe-mode-reference.png");
assertValidPng("docs/reference-ui/pro-mode-reference.png");

const pro = read(proFile);
const vibe = read(vibeFile);
const shell = read(shellFile);
const previewSurface = read(previewSurfaceFile);

// Required structural signals
assert(pro.includes("pro-grid"));
assert(pro.includes("pro-panel"));
assert(pro.includes("pro-toolbar"));
assert(pro.includes("pro-status-bar"));

assert(vibe.includes("vibe-dashboard-layout"));
assert(vibe.includes("vibe-chat-timeline"));
assert(vibe.includes("vibe-input-shell"));
assert(vibe.includes("vibe-right-rail"));
assert(vibe.includes("vibe-preview-canvas"));

assert(shell.includes("project-workspace-sidebar"));
assert(shell.includes("project-workspace-recent-projects"));
assert(shell.includes("project-workspace-go-pro"));
assert(shell.includes("project-workspace-account-strip"));

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
assert(!vibe.includes("Apply destructive sample"));
assert(!vibe.includes("JSON.stringify(latestReviewPayload"));
assert(!previewSurface.includes("<pre>{JSON.stringify"));

// Scripts include all waves
const pkg = read("package.json");
for (let i = 25; i <= 40; i++) {
  assert(pkg.includes(`test:wave-0${i}`));
}

console.log("WAVE-041 checks passed");
