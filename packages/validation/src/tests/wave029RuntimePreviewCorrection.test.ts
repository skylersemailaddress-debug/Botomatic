import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const root = process.cwd();
const runtimePreview = fs.readFileSync(path.join(root, "apps/control-plane/src/services/runtimePreview.ts"), "utf8");
const proDashboard = fs.readFileSync(path.join(root, "apps/control-plane/src/components/pro/ProDashboard.tsx"), "utf8");
const vibeDashboard = fs.readFileSync(path.join(root, "apps/control-plane/src/components/vibe/VibeDashboard.tsx"), "utf8");
const runtimePanel = fs.readFileSync(path.join(root, "apps/control-plane/src/components/runtime/RuntimePreviewPanel.tsx"), "utf8");

assert.match(runtimePreview, /export function resolveRuntimePreview/);
assert.match(runtimePreview, /export function normalizePreviewUrl/);
assert.match(runtimePreview, /export function derivePreviewUrlFromBrowser/);
assert.match(runtimePreview, /codespaces|app\.github\.dev/);
assert.match(runtimePreview, /env === "local" \|\| env === "lan"/);
assert.doesNotMatch(runtimePreview, /env === "local" \|\| env === "lan" \|\| env === "browser"/);
assert.match(runtimePreview, /env === "codespaces"/);
assert.doesNotMatch(proDashboard, /http:\/\/localhost:3000/);
assert.doesNotMatch(vibeDashboard, /http:\/\/localhost:3000/);
assert.match(proDashboard + runtimePanel, /resolveRuntimePreview|LiveApplicationPanel/);
assert.doesNotMatch(vibeDashboard, /fetch\(/);
assert.match(vibeDashboard, /getProjectRuntimeState/);
assert.match(vibeDashboard + runtimePanel, /VibeLivePreviewPanel|resolveRuntimePreview/);
assert.match(runtimePanel, /Preview unavailable/);
assert.match(runtimePanel, /Runtime not connected/);
assert.match(runtimePreview, /if \(normalizedBackendUrl\)/);
assert.match(runtimePanel, /Derived preview|Unverified preview URL/);

console.log("WAVE-029 runtime preview correction checks passed.");
