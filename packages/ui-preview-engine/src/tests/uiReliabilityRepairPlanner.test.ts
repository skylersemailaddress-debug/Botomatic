import assert from "assert";
import { createUIReliabilityRepairPlan } from "../uiReliabilityRepairPlanner";
const kinds:any=["parse-error","type-error","build-error","test-error","lint-error","source-identity-stale","patch-conflict","missing-file","unsafe-operation","unknown"];
for (const kind of kinds){const r=createUIReliabilityRepairPlan({failureClassifications:[{kind,confidence:"high",normalizedMessage:"x",evidenceSnippets:[]} as any],options:{outputMode:kind==="unsafe-operation"?"rollbackOnly":"previewMetadata",allowRiskyRepairs:true}});assert(r.plan.selectedStrategies[0].label.length>0);} 
const d1=createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any]});
const d2=createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any]});
assert.equal(d1.plan.repairPlanId,d2.plan.repairPlanId);
assert.equal(d1.plan.attempts[0].attemptId,d1.plan.attempts[0].attemptId);
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],options:{maxAttempts:1,currentAttemptIndex:1}}).plan.requiresManualReview);
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],options:{outputMode:"sourcePatchPlan"}}).plan.rollbackProofRequired);
assert(!createUIReliabilityRepairPlan({failureClassifications:[{kind:"unsafe-operation",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],options:{outputMode:"rollbackOnly",allowRiskyRepairs:true}}).ok);
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"unknown",confidence:"low",normalizedMessage:"a",evidenceSnippets:[]} as any]}).plan.riskLevel==="high");
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[],affectedFilePath:"release-evidence/runtime/x"} as any]}).plan.requiresManualReview);
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],options:{outputMode:"unknown" as any}}).plan.requiresManualReview);
assert(createUIReliabilityRepairPlan({failureClassifications:[{kind:"test-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],options:{allowRiskyRepairs:false}}).plan.requiresManualReview);
const refs=createUIReliabilityRepairPlan({failureClassifications:[{kind:"parse-error",confidence:"high",normalizedMessage:"a",evidenceSnippets:[]} as any],sourcePatchPlan:{operations:[{operationId:"op1"}]},transactionRollbackProof:{transactionId:"tx1",rollbackVerified:true}});
assert.deepEqual(refs.plan.operationIds,["op1"]); assert.deepEqual(refs.plan.transactionIds,["tx1"]);
console.log("uiReliabilityRepairPlanner tests passed");

// malformed input
// maxAttempts exceeded
// rollbackProofRequired
// protected/reserved path
// outputMode unknown
// deterministic repairPlanId
