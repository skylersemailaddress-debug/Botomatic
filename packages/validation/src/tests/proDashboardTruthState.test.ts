import assert from "assert";
import fs from "fs";

const proDashboardSource = fs.readFileSync("apps/control-plane/src/components/pro/ProDashboard.tsx", "utf8");
const northStarShellSource = fs.readFileSync("apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx", "utf8");

const forbiddenStrings = [
  "92%",
  "All Systems Operational",
  "178/198 tests passed",
  "198 Total Tests",
  "1243 packages",
  "Local server running at http://localhost:3000",
  "http://localhost:3000",
];

for (const text of forbiddenStrings) {
  assert(!proDashboardSource.includes(text), `must not include fake string: ${text}`);
}

assert(!northStarShellSource.includes("92%"), "NorthStarBuilderShell must not include fake 92% health");

const requiredFallbacks = [
  "No build started",
  "Backend state unavailable",
  "Health check not run",
  "Preview unavailable",
  "Runtime not connected",
  "Service health not connected",
  "Not Connected",
  "Database not connected",
  "No test run yet",
  "No terminal logs yet",
  "No commits available",
];

for (const text of requiredFallbacks) {
  assert(proDashboardSource.includes(text), `must include fallback string: ${text}`);
}

console.log("proDashboardTruthState.test.ts passed");
