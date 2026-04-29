import { type RepoValidatorResult } from "../repoValidators";
import fs from "fs";
import path from "path";

export function validateLiveUIBuilderDesignSystemReadiness(root: string): RepoValidatorResult {
  const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
  const has = (p: string) => fs.existsSync(path.join(root, p));
  const checks = ["packages/ui-preview-engine/src/uiDesignTokenModel.ts","packages/ui-preview-engine/src/uiDesignTokenNormalizer.ts","packages/ui-preview-engine/src/uiStyleControlPlan.ts","packages/ui-preview-engine/src/uiStyleControlPlanner.ts","packages/ui-preview-engine/src/tests/uiDesignTokenNormalizer.test.ts","packages/ui-preview-engine/src/tests/uiStyleControlPlanner.test.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","package.json"];
  if (!checks.every(has)) return { name: "Validate-Botomatic-LiveUIBuilderDesignSystemReadiness", status: "failed", summary: "missing required files", checks };
  const m=read(checks[0]),n=read(checks[1]),p=read(checks[2]),pl=read(checks[3]),t=read(checks[4]),sp=read(checks[5]),panel=read(checks[6]),pkg=read(checks[7]);
  const uni=(pkg.match(/"test:universal"\s*:\s*"([^"]+)"/)?.[1]??"");
  const ok=m.includes("UIDesignTokenSet") && n.includes("duplicate-normalized-name") && n.includes("unsafePattern") && n.includes("duplicate-normalized-name") && pl.includes("createHash") && pl.includes(":root") && p.includes("UI_STYLE_CONTROL_DRY_RUN_CAVEAT") && panel.includes("Style plan id:") && panel.includes("Design token planning is dry-run only") && (t.includes("url(javascript:)") || t.includes("expression(")) && (t.includes("negative-spacing") || t.includes("negative spacing")) && t.includes("duplicate") && !pl.includes("from \"fs\"") && !pl.includes("writeFile") && !pl.toLowerCase().includes("deployment/export") && pkg.includes("test:ui-design-token-model") && pkg.includes("test:ui-design-token-normalizer") && pkg.includes("test:ui-style-control-plan") && pkg.includes("test:ui-style-control-planner") && uni.includes("test:ui-style-control-planner");
  return { name: "Validate-Botomatic-LiveUIBuilderDesignSystemReadiness", status: ok?"passed":"failed", summary: ok?"design token/style control readiness validated":"missing deterministic style planning safeguards", checks };
}
