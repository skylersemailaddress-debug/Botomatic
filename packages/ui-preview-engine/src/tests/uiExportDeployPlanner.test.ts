import assert from "assert";
import { createUIExportDeployPlan } from "../uiExportDeployPlanner";
const input={sourceFiles:{"src/a.ts":"a"},sourcePatchPlan:{operations:[{operationId:"op2",target:{filePath:"src/b.ts"}},{operationId:"op1",target:{filePath:"src/a.ts"}}]},fullProjectGenerationPlan:{planId:"fp1",files:[{path:"src/a.ts",contents:"a"}]},scalabilityPlan:{planId:"sp1",riskLevel:"low"},reliabilityRepairPlan:{repairPlanId:"rp1",requiresManualReview:false},uxControlPlan:{uxControlPlanId:"ux1",requiresManualReview:false},options:{provider:"vercel",framework:"next",targetName:"preview"}} as any;
const a=createUIExportDeployPlan(input); const b=createUIExportDeployPlan(input);
assert.equal(a.exportDeployPlanId,b.exportDeployPlanId);assert.equal(a.fullProjectPlanId,"fp1");assert.equal(a.scalabilityPlanId,"sp1");assert.equal(a.reliabilityRepairPlanId,"rp1");assert.equal(a.uxControlPlanId,"ux1");assert.deepEqual(a.sourcePatchOperationIds,["op1","op2"]);assert.equal(a.liveDeployBlocked,true);
const c=createUIExportDeployPlan({...input,options:{...input.options,allowLiveDeploy:true,requireRollbackPlan:true,target:{}}});
assert(c.requiresManualReview && c.blockedReasons.join(" ").includes("allowLiveDeploy=true blocked"));
console.log("uiExportDeployPlanner.test.ts passed");
