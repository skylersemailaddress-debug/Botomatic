import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

const firstRun = read("apps/control-plane/src/services/firstRun.ts");
assert(firstRun.includes("export async function getFirstRunState"));
assert(firstRun.includes("export function deriveFirstRunState"));
assert(firstRun.includes("export function getFirstRunFallback"));
assert(firstRun.includes('from "./projectState"'));
assert(firstRun.includes('from "./execution"'));
assert(firstRun.includes('from "./runtimeStatus"'));

const vibe = read("apps/control-plane/src/components/vibe/VibeDashboard.tsx");
assert(vibe.includes("What's Next"));
assert(vibe.includes("getFirstRunState"));
assert(vibe.includes("firstRunState.steps.map"));
assert(vibe.includes("Describe your app idea"));
assert(vibe.includes("No first-run state yet"));
assert(vibe.includes("Launch proof missing"));
assert(vibe.includes("Review launch requirements") || firstRun.includes("Review launch requirements"));
assert(vibe.includes("disabled={!firstRunState.canLaunch}"));
assert(!firstRun.includes("const canLaunch = hasRuntimePreview && !executionBlocked"));
assert(firstRun.includes("hasExplicitLaunchProof"));
assert(firstRun.includes("launchProof") && firstRun.includes("launchReady") && firstRun.includes("launchReadiness"));
assert(firstRun.includes("deployment?.ready") && firstRun.includes("proof?.launch") && firstRun.includes("releaseEvidence?.launchReady"));
assert(firstRun.includes("launch?.proof") && firstRun.includes("launch?.ready"));
assert(!vibe.includes("Ask anything…") || vibe.match(/Ask anything…/g)?.length === 1);

const home = read("apps/control-plane/src/app/page.tsx");
assert(home.includes("createLaunchProject") || firstRun.includes("Project creation not connected"));
assert(firstRun.includes("Project creation not connected"));

for (const forbidden of ["Ready to launch", "Everything looks good", "Build complete", "App launched", "Deployed successfully"]) {
  assert(!vibe.includes(forbidden));
  assert(!firstRun.includes(forbidden));
}

for (const prior of [
  "packages/validation/src/tests/proDashboardTruthState.test.ts",
  "packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts",
  "packages/validation/src/tests/wave027StatePersistenceResolution.test.ts",
  "packages/validation/src/tests/wave028PanelTruthHardening.test.ts",
  "packages/validation/src/tests/wave029RuntimePreviewCorrection.test.ts",
  "packages/validation/src/tests/wave030ExecutionLayerActivation.test.ts",
]) {
  assert(fs.existsSync(path.join(root, prior)), `${prior} missing`);
}

console.log("WAVE-031 first-run experience reality checks passed");
