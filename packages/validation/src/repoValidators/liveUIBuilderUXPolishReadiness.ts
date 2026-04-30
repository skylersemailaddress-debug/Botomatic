import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderUXPolishReadiness(root: string): RepoValidatorResult {
  const files = [
    "packages/ui-preview-engine/src/uiBuilderUXControlModel.ts",
    "packages/ui-preview-engine/src/uiBuilderUXControlPlanner.ts",
    "packages/ui-preview-engine/src/tests/uiBuilderUXControlModel.test.ts",
    "packages/ui-preview-engine/src/tests/uiBuilderUXControlPlanner.test.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts",
    "package.json",
  ];
  const okFiles = files.every((f) => fs.existsSync(path.join(root, f)));
  const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
  const model = okFiles ? read(files[0]) : "";
  const planner = okFiles ? read(files[1]) : "";
  const tests = okFiles ? read(files[2]) + read(files[3]) : "";
  const panel = okFiles ? read(files[4]) : "";
  const panelTest = okFiles ? read(files[5]) : "";
  const pjson = okFiles ? read(files[6]) : "";
  const banned = ["fs", "child_process", "exec", "spawn", "execa", "fetch", "axios", "writeFile", "document.", "window.", "performance.now", "Date.now"];
  const requiredSignals = ["dryRun", "apply", "uxControlPlanId", "commandPreviewMs", "directManipulationPreviewMs", "sourceSyncPreviewMs", "cmd/ctrl+enter", "cmd/ctrl+shift+enter", "escape", "undo", "redo", "slash", "unknown_active_mode", "Fix validation errors before applying.", "Repair plan requires manual review before apply."];
  const testSignals = ["deterministic", "dryRun", "apply", "dryRunReady", "simulated", "idle", "applyBlocked", "hasPendingMutation", "inspect", "unknown_active_mode", "validation", "repair", "cmd/ctrl+enter", "cmd/ctrl+shift+enter", "escape", "undo", "redo", "slash"];
  const ok = okFiles
    && model.includes("UIBuilderUXControlInput")
    && model.includes("UIBuilderUXControlPlan")
    && model.includes("deterministic dry-run planning")
    && planner.includes("ux-control-")
    && requiredSignals.every((s) => planner.includes(s) || tests.includes(s))
    && panel.includes("UX control plan id")
    && panel.includes("Builder UX control planning is dry-run only and does not mutate UI, write files, deploy, or prove runtime performance.")
    && panelTest.includes("UX control plan id")
    && pjson.includes("test:ui-builder-ux-control-model")
    && pjson.includes("test:ui-builder-ux-control-planner")
    && pjson.includes("test:universal")
    && testSignals.every((s) => tests.toLowerCase().includes(s.toLowerCase()))
    && banned.every((token) => !planner.includes(token));
  return { name: "Validate-Botomatic-LiveUIBuilderUXPolishReadiness", status: ok ? "passed" : "failed", summary: ok ? "Live UI Builder UX polish readiness checks passed." : "Live UI Builder UX polish readiness missing or shallow.", checks: files };
}
