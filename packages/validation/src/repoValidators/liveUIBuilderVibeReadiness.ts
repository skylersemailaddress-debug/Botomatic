import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const has = (root: string, rel: string) => fs.existsSync(path.join(root, rel));
const read = (root: string, rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

export function validateLiveUIBuilderVibeReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderReviewPanel.tsx",
    "apps/control-plane/src/components/live-ui-builder/useLiveUIBuilderInteraction.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderReviewPanel.test.tsx",
    "apps/control-plane/src/components/live-ui-builder/useLiveUIBuilderInteraction.test.tsx",
    "apps/control-plane/src/components/vibe/VibeDashboard.tsx",
    "package.json",
    "packages/validation/src/repoValidators.ts",
  ];
  if (!checks.every((c) => has(root, c))) return { name: "Validate-Botomatic-LiveUIBuilderVibeReadiness", status: "failed", summary: "Required Vibe integration files are missing.", checks };
  const panel = read(root, checks[0]);
  const hook = read(root, checks[1]);
  const pkg = read(root, checks[5]);
  const validators = read(root, checks[6]);
  const ok =
    panel.includes("Live UI Builder Preview") &&
    panel.includes("Source sync is planning-only") &&
    panel.includes("Confirm") &&
    panel.includes("Reject") &&
    hook.includes("submitTypedEdit") &&
    hook.includes("submitSpokenEdit") &&
    hook.includes("result.nextState") &&
    hook.includes("confirmPendingEdit") &&
    hook.includes("rejectPendingEdit") &&
    pkg.includes("test:live-ui-builder-vibe-panel") &&
    pkg.includes("test:live-ui-builder-vibe-hook") &&
    validators.includes("validateLiveUIBuilderVibeReadiness") &&
    !panel.toLowerCase().includes("source rewrite") &&
    !panel.toLowerCase().includes("export readiness") &&
    !hook.toLowerCase().includes("deploy");

  return {
    name: "Validate-Botomatic-LiveUIBuilderVibeReadiness",
    status: ok ? "passed" : "failed",
    summary: ok ? "Live UI Builder Vibe review panel/hook wiring is present with planning-only claim boundaries." : "Live UI Builder Vibe readiness checks failed.",
    checks,
  };
}
