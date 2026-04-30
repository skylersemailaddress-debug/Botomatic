import assert from "assert";
import fs from "fs";

const pro = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");
const vibe = fs.readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");

const forbiddenPro = ["92%", "All Systems Operational", "178/198", "198 Total Tests", "1243 packages", "Local Server · Running", "http://localhost:3000", "Compilation successful", "I've optimized"];
for (const text of forbiddenPro) assert(!pro.includes(text), `forbidden pro string present: ${text}`);

assert(!pro.includes("fallbackSignalText"), "ProDashboard must not include fallbackSignalText or hidden fallback stuffing helper");
const srOnlyMatch = pro.match(/<p className="sr-only">([\s\S]*?)<\/p>/);
assert(srOnlyMatch, "Pro dashboard must keep sr-only route regression signal line");
const srOnlyLine = srOnlyMatch?.[1] ?? "";
for (const routeSignal of ["Code Changes", "AI Copilot", "Deploy"]) {
  assert(srOnlyLine.includes(routeSignal), `sr-only route signal must include: ${routeSignal}`);
}
for (const forbiddenFallback of ["Backend state unavailable", "No test run yet", "Runtime not connected", "No terminal logs yet"]) {
  assert(!srOnlyLine.includes(forbiddenFallback), `sr-only route signal must not include operational fallback stuffing: ${forbiddenFallback}`);
}

assert(!vibe.includes("<strong>Live</strong>"), "Vibe live preview must not claim Live without backend proof");
assert(!vibe.includes("10:24 AM"), "Vibe recent activity must not use fake timestamps");

const requiredFallbacks = [
  "Backend state unavailable",
  "Service health not connected",
  "Database not connected",
  "No test run yet",
  "No terminal logs yet",
  "No commits available",
  "Health check not run",
  "Preview unavailable",
  "Runtime not connected",
  "No code changes available",
  "Repository diff not connected",
  "No Copilot activity yet",
  "No recent activity",
  "No launch proof yet",
];
for (const text of requiredFallbacks) assert((pro + vibe).includes(text), `missing required fallback: ${text}`);

for (const signal of ["Build Map", "Code Changes", "AI Copilot", "Deploy"]) {
  assert((pro + vibe).includes(signal), `missing route regression signal: ${signal}`);
}

console.log("wave028PanelTruthHardening.test.ts passed");
