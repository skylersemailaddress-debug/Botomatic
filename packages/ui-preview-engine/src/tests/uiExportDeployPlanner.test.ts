import assert from "assert";
import { createUIExportDeployPlan } from "../uiExportDeployPlanner";

const base = { sourceFiles: { "src/a.ts": "a" }, sourcePatchPlan: { operations: [{ operationId: "op2", target: { filePath: "src/b.ts" } }, { operationId: "op1", target: { filePath: "src/a.ts" } }] }, fullProjectGenerationPlan: { planId: "fp1", files: [{ path: "src/a.ts", contents: "a" }] }, scalabilityPlan: { planId: "sp1", riskLevel: "low" }, reliabilityRepairPlan: { repairPlanId: "rp1", requiresManualReview: false }, uxControlPlan: { uxControlPlanId: "ux1", requiresManualReview: false }, options: { provider: "vercel", framework: "next", targetName: "preview" } } as any;

const a = createUIExportDeployPlan(base); const b = createUIExportDeployPlan(base);
assert.equal(a.exportDeployPlanId, b.exportDeployPlanId);
assert.equal(a.fullProjectPlanId, "fp1"); assert.equal(a.scalabilityPlanId, "sp1"); assert.equal(a.reliabilityRepairPlanId, "rp1"); assert.equal(a.uxControlPlanId, "ux1");
assert.deepEqual(a.sourcePatchOperationIds, ["op1", "op2"]);
assert.equal(a.liveDeployBlocked, true);

assert(createUIExportDeployPlan({ ...base, options: { ...base.options, provider: "unknown" } }).requiresManualReview);
assert(createUIExportDeployPlan({ ...base, options: { ...base.options, requireRollbackPlan: true, target: {} } }).blockedReasons.join(" ").includes("rollback required but missing"));
assert(createUIExportDeployPlan({ ...base, sourceFiles: { "/unsafe.ts": "x" } }).riskLevel === "high");
assert(createUIExportDeployPlan({ ...base, environmentVariables: [{ name: "API_KEY", required: true }] }).riskLevel === "high");
const liveBlocked = createUIExportDeployPlan({ ...base, options: { ...base.options, allowLiveDeploy: true } });
assert(liveBlocked.requiresManualReview && liveBlocked.riskLevel === "high" && liveBlocked.blockedReasons.join(" ").includes("allowLiveDeploy=true blocked"));

console.log("uiExportDeployPlanner.test.ts passed");
