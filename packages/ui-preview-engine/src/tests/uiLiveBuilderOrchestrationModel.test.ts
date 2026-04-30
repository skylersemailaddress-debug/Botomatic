import assert from "assert";
import { UI_LIVE_BUILDER_ORCHESTRATION_CAVEAT, UI_LIVE_BUILDER_ORCHESTRATION_STAGE_IDS } from "../uiLiveBuilderOrchestrationModel";
assert(UI_LIVE_BUILDER_ORCHESTRATION_CAVEAT.includes("deterministic dry-run planning"));
assert.deepEqual(UI_LIVE_BUILDER_ORCHESTRATION_STAGE_IDS,["command","target-resolution","ui-mutation","direct-manipulation","app-structure","source-identity","multi-file","full-project","design-system","data-state-api","reliability-repair","scalability-performance","ux-control","export-deploy","platform-builder"]);
const required=["orchestrationPlanId","stages","dependencies","gates","orderedStageIds","upstreamPlanIds","affectedFilePaths","changedFiles","blockedReasons","caveats","riskLevel","requiresManualReview","readyForSourceApply","readyForExportPlanning","readyForPlatformPlanning","executionBlocked","caveat"];
for (const key of required) assert(key.length>0);
console.log("uiLiveBuilderOrchestrationModel.test.ts passed");
