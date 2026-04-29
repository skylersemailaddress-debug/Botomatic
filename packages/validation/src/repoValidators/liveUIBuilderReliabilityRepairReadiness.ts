import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";
export function validateLiveUIBuilderReliabilityRepairReadiness(root: string): RepoValidatorResult {
  const files=["packages/ui-preview-engine/src/uiReliabilityRepairModel.ts","packages/ui-preview-engine/src/uiReliabilityFailureClassifier.ts","packages/ui-preview-engine/src/uiReliabilityRepairPlanner.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","packages/ui-preview-engine/src/tests/uiReliabilityFailureClassifier.test.ts","packages/ui-preview-engine/src/tests/uiReliabilityRepairPlanner.test.ts","packages/ui-preview-engine/src/tests/uiReliabilityRepairModel.test.ts"];
  const okFiles=files.every(f=>fs.existsSync(path.join(root,f))); const txt=(f:string)=>fs.readFileSync(path.join(root,f),"utf8");
  const classifier=okFiles?txt(files[1]):""; const planner=okFiles?txt(files[2]):""; const panel=okFiles?txt(files[3]):""; const model=okFiles?txt(files[0]):""; const pjson=txt("package.json"); const tests=txt(files[4])+txt(files[5]);
  const banned=["fs","child_process","exec","spawn","execa","fetch","axios","writeFile","deploy","export"];
  const hasKinds=["parse-error","type-error","build-error","test-error","lint-error","source-identity-stale","patch-conflict","missing-file","unsafe-operation","unknown"].every(k=>classifier.includes(k)||planner.includes(k)||tests.includes(k));
  const hasSignals=["malformed","maxAttempts","rollbackProofRequired","protected/reserved","outputMode","deterministic"].every(s=>tests.includes(s));
  const ok=okFiles && model.includes("deterministic dry-run planning") && classifier.includes("classifyUIRepairFailures") && planner.includes("repairPlanId") && planner.includes("maxAttempts") && planner.includes("rollbackProofRequired") && panel.includes("Repair plan id") && panel.includes("Reliability repair planning is dry-run only") && pjson.includes("test:ui-reliability-repair-model") && pjson.includes("test:ui-reliability-failure-classifier") && pjson.includes("test:ui-reliability-repair-planner") && pjson.includes("test:universal") && hasKinds && hasSignals && banned.every(b=>!classifier.includes(`from \"${b}\"`)&&!planner.includes(`from \"${b}\"`));
  return { name:"Validate-Botomatic-LiveUIBuilderReliabilityRepairReadiness", status:ok?"passed":"failed", summary:ok?"Live UI reliability repair planning readiness checks passed.":"Live UI reliability repair planning readiness missing or shallow.", checks:files };
}
