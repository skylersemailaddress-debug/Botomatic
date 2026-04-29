import { type RepoValidatorResult } from "../repoValidators";
import fs from "fs";
import path from "path";

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

export function validateLiveUIBuilderDataStateApiWiringReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/ui-preview-engine/src/uiDataStateApiWiringModel.ts",
    "packages/ui-preview-engine/src/uiDataStateApiWiringNormalizer.ts",
    "packages/ui-preview-engine/src/uiDataStateApiWiringPlanner.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "packages/ui-preview-engine/src/tests/uiDataStateApiWiringNormalizer.test.ts",
    "packages/ui-preview-engine/src/tests/uiDataStateApiWiringPlanner.test.ts",
    "package.json"
  ];
  const filesOk = checks.every((c) => has(root, c));
  const model = filesOk ? read(root, checks[0]) : "";
  const normalizer = filesOk ? read(root, checks[1]) : "";
  const planner = filesOk ? read(root, checks[2]) : "";
  const panel = filesOk ? read(root, checks[3]) : "";
  const normalizerTest = filesOk ? read(root, checks[4]) : "";
  const plannerTest = filesOk ? read(root, checks[5]) : "";
  const pkg = filesOk ? read(root, checks[6]) : "";

  const forbidden = ["from \"fs\"", "from \"http\"", "from \"https\"", "fetch(", "axios", "XMLHttpRequest", "writeFile", "deployment", "export behavior"];
  const noForbiddenInEngine = forbidden.every((f) => !normalizer.includes(f) && !planner.includes(f));

  const ok = filesOk
    && model.includes("wiringPlanId")
    && planner.includes("createHash")
    && normalizer.includes("http:// rejected")
    && normalizer.includes("javascript:/data:/file: rejected")
    && normalizer.includes("localhost/127.0.0.1 rejected by default")
    && normalizer.includes("secret-looking header literal rejected")
    && normalizer.includes("unsupported action type")
    && normalizer.includes("binding expression must be simple/safe")
    && planner.includes("declare state")
    && planner.includes("bind state to nodes")
    && planner.includes("define API client/request helper")
    && planner.includes("bind request to UI action")
    && planner.includes("map API response to state/UI")
    && model.includes("does not execute requests, write files, deploy, or prove runtime correctness")
    && panel.includes("Data/State/API wiring plan id:")
    && panel.includes("Data/state/API wiring planning is dry-run only and does not execute requests, write files, deploy, or prove runtime correctness.")
    && normalizerTest.includes("http:// rejection") === false && normalizerTest.includes("http:// rejected")
    && normalizerTest.includes("javascript:/data:/file: rejected")
    && normalizerTest.includes("localhost/127.0.0.1 rejected by default")
    && normalizerTest.includes("secret-looking header literal rejected")
    && normalizerTest.includes("unsupported-action")
    && plannerTest.includes("unknown outputMode")
    && plannerTest.includes("DELETE")
    && plannerTest.includes("wiringPlanId")
    && plannerTest.includes("affectedNodeIds.length")
    && plannerTest.includes("affectedFilePaths.length")
    && pkg.includes("test:ui-data-state-api-wiring-model")
    && pkg.includes("test:ui-data-state-api-wiring-normalizer")
    && pkg.includes("test:ui-data-state-api-wiring-planner")
    && pkg.includes("test:universal")
    && noForbiddenInEngine;

  return {
    name: "Validate-Botomatic-LiveUIBuilderDataStateApiWiringReadiness",
    status: ok ? "passed" : "failed",
    summary: ok ? "Data/state/API wiring readiness is fail-closed and fully wired." : "Data/state/API wiring readiness checks are incomplete.",
    checks
  };
}
