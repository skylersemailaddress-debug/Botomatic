import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

const execution = read("apps/control-plane/src/services/execution.ts");
assert(execution.includes("export async function getExecutionRun"));
assert(execution.includes("export async function startExecutionJob"));
assert(execution.includes("export function normalizeExecutionRun"));
assert(execution.includes("/execution/${encodeURIComponent(runId)}"));
assert(execution.includes("/execution"));
assert(execution.includes("/status"));
assert(execution.includes("/state"));
assert(execution.includes("/ui/overview"));
assert(execution.includes("Execution runner unavailable"));
assert(!execution.includes('"/api/hybrid-ci"'));
assert(!execution.includes('"/api/orchestrate/action"'));

const vibeHook = read("apps/control-plane/src/components/builder/useVibeOrchestration.ts");
const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
const pro = read("apps/control-plane/src/components/pro/ProDashboard.tsx");
const proSvc = read("apps/control-plane/src/services/proDashboard.ts");
assert(vibeHook.includes("Execution status unavailable") || vibe.includes("Execution status unavailable"));
assert(vibeHook.includes("No execution run yet") || pro.includes("No execution run yet"));
assert(execution.includes("Execution runner unavailable"));
assert(pro.includes("No terminal logs yet"));
assert(pro.includes("No test run yet"));
assert(proSvc.includes("getExecutionRun"));

const forbidden = ["Build succeeded", "Tests passed", "Deploy successful"];
for (const word of forbidden) {
  assert(!pro.includes(word));
  assert(!vibe.includes(word));
}

for (const prior of [
  "packages/validation/src/tests/proDashboardTruthState.test.ts",
  "packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts",
  "packages/validation/src/tests/wave027StatePersistenceResolution.test.ts",
  "packages/validation/src/tests/wave028PanelTruthHardening.test.ts",
  "packages/validation/src/tests/wave029RuntimePreviewCorrection.test.ts",
]) {
  assert(fs.existsSync(path.join(root, prior)), `${prior} missing`);
}

console.log("WAVE-030 execution layer activation checks passed");
