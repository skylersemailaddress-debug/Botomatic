import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const has = (root: string, rel: string) => fs.existsSync(path.join(root, rel));
const read = (root: string, rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const result = (name: string, ok: boolean, summary: string, checks: string[]): RepoValidatorResult => ({ name, status: ok ? "passed" : "failed", summary, checks });

export function validateLiveUIBuilderDirectManipulationReadiness(root: string): RepoValidatorResult {
  const name = "Validate-Botomatic-LiveUIBuilderDirectManipulationReadiness";
  const checks = ["packages/ui-preview-engine/src/uiDirectManipulationModel.ts","packages/ui-preview-engine/src/uiDirectManipulationMutation.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDirectManipulationOverlay.tsx","packages/ui-preview-engine/src/tests/uiDirectManipulationModel.test.ts","packages/ui-preview-engine/src/tests/uiDirectManipulationMutation.test.ts","packages/validation/src/tests/liveUIBuilderDirectManipulationOverlay.test.ts","package.json","packages/validation/src/repoValidators.ts"];
  const filesOk = checks.every((p) => has(root, p));
  if (!filesOk) return result(name, false, "Missing direct manipulation readiness files.", checks);
  const pkg = JSON.parse(read(root, "package.json")) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  const uni = scripts["test:universal"] ?? "";
  const mut = read(root, "packages/ui-preview-engine/src/uiDirectManipulationMutation.ts");
  const validators = read(root, "packages/validation/src/repoValidators.ts");
  const ok = Boolean(
    scripts["test:ui-direct-manipulation-model"] && scripts["test:ui-direct-manipulation-mutation"] && scripts["test:live-ui-builder-direct-manipulation-overlay"] &&
    uni.includes("test:ui-direct-manipulation-model") && uni.includes("test:ui-direct-manipulation-mutation") && uni.includes("test:live-ui-builder-direct-manipulation-overlay") &&
    validators.includes("validateLiveUIBuilderDirectManipulationReadiness") && mut.includes("collectSubtree") && mut.includes("node.parentId") && !mut.includes("new Date(") && !mut.includes("Date.now") && !mut.includes("new Date(") && !mut.includes("Date.now")
  );
  return result(name, ok, ok ? "Live UI direct manipulation readiness is wired and deterministic." : "Live UI direct manipulation readiness wiring incomplete.", checks);
}
