import { type RepoValidatorResult } from "../repoValidators";
import fs from "fs";
import path from "path";

export function validateLiveUIBuilderFullProjectGenerationReadiness(root: string): RepoValidatorResult {
  const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
  const has = (p: string) => fs.existsSync(path.join(root, p));
  const checks = [
    "packages/ui-preview-engine/src/uiFullProjectGenerationPlan.ts",
    "packages/ui-preview-engine/src/uiFullProjectGenerator.ts",
    "packages/ui-preview-engine/src/uiProjectPathNormalizer.ts",
    "packages/ui-preview-engine/src/tests/uiProjectPathNormalizer.test.ts",
    "packages/ui-preview-engine/src/tests/uiFullProjectGenerationPlan.test.ts",
    "packages/ui-preview-engine/src/tests/uiFullProjectGenerator.test.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "package.json"
  ];
  if (!checks.every(has)) return { name: "Validate-Botomatic-LiveUIBuilderFullProjectGenerationReadiness", status: "failed", summary: "missing required files", checks };
  const gen = read("packages/ui-preview-engine/src/uiFullProjectGenerator.ts");
  const normalizer = read("packages/ui-preview-engine/src/uiProjectPathNormalizer.ts");
  const plan = read("packages/ui-preview-engine/src/uiFullProjectGenerationPlan.ts");
  const panel = read("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx");
  const pkg = read("package.json");
  const universal = (pkg.match(/"test:universal"\s*:\s*"([^"]+)"/)?.[1] ?? "");
  const ok = plan.includes("UIFullProjectGenerationPlan")
    && gen.includes("createHash")
    && normalizer.includes("absolute path rejected")
    && normalizer.includes("path traversal rejected")
    && normalizer.includes("reserved runtime evidence path rejected")
    && normalizer.includes("sortProjectFilePaths")
    && gen.includes("frameworkFiles")
    && plan.includes("does not write files, install dependencies, deploy, or prove runtime correctness")
    && panel.includes("Full project generation is dry-run only and does not write files, install dependencies, deploy, or prove runtime correctness.")
    && pkg.includes("test:ui-project-path-normalizer")
    && pkg.includes("test:ui-full-project-generation-plan")
    && pkg.includes("test:ui-full-project-generator")
    && universal.includes("test:ui-full-project-generator")
    && !gen.includes("from \"fs\"")
    && !gen.includes("writeFile")
    && !gen.toLowerCase().includes("deployment/export behavior");
  return { name: "Validate-Botomatic-LiveUIBuilderFullProjectGenerationReadiness", status: ok ? "passed" : "failed", summary: ok ? "full project generation readiness validated" : "missing deterministic/guardrail behavior", checks };
}
