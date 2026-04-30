import { type RepoValidatorResult } from "../repoValidators";
import fs from "fs";
import path from "path";

export function validateLiveUIBuilderScalabilityPerformanceReadiness(root: string): RepoValidatorResult {
  const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
  const has = (p: string) => fs.existsSync(path.join(root, p));
  const checks = ["packages/ui-preview-engine/src/uiScalabilityPerformanceModel.ts","packages/ui-preview-engine/src/uiScalabilityPerformanceAnalyzer.ts","packages/ui-preview-engine/src/uiScalabilityChunkPlanner.ts","packages/ui-preview-engine/src/tests/uiScalabilityPerformanceModel.test.ts","packages/ui-preview-engine/src/tests/uiScalabilityPerformanceAnalyzer.test.ts","packages/ui-preview-engine/src/tests/uiScalabilityChunkPlanner.test.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","package.json"];
  if (!checks.every(has)) return { name:"Validate-Botomatic-LiveUIBuilderScalabilityPerformanceReadiness", status:"failed", summary:"missing required files", checks };
  const analyzer=read(checks[1]); const planner=read(checks[2]); const panel=read(checks[6]); const pkg=read("package.json");
  const t=read(checks[3])+read(checks[4])+read(checks[5]);
  const universal=(pkg.match(/"test:universal"\s*:\s*"([^"]+)"/)?.[1]??"");
  const banned=["from \"fs\"","child_process","exec(","spawn(","execa","fetch(","axios","writeFile","performance.now","Date.now","deployment/export behavior"]; 
  const ok = analyzer.includes("createHash") && analyzer.includes("sourceFiles missing while source analysis is implied") && analyzer.includes("operation count exceeds safe limit") && planner.includes("nodeId") && planner.includes("filePath") && planner.includes("pagination") && panel.includes("Scalability plan id") && panel.includes("dry-run only and does not execute benchmarks, write files, deploy, or prove runtime performance") && pkg.includes("test:ui-scalability-performance-model") && pkg.includes("test:ui-scalability-performance-analyzer") && pkg.includes("test:ui-scalability-chunk-planner") && universal.includes("test:ui-scalability-performance-analyzer") && !banned.some((b)=>analyzer.includes(b) || planner.includes(b));
  return { name:"Validate-Botomatic-LiveUIBuilderScalabilityPerformanceReadiness", status: ok?"passed":"failed", summary: ok?"scalability performance readiness validated":"missing scalability behavior/readiness coverage", checks };
}
