import assert from "assert";
import { planUIBuilderUXControls } from "../uiBuilderUXControlPlanner";

const base = {
  sourceSyncStatus: "dryRunReady",
  selectedNodeId: "node-1",
  activeMode: "inspect",
  commandText: "update button",
  hasPendingMutation: false,
  hasPendingPreview: false,
  hasUnappliedChanges: true,
  hasValidationErrors: false,
  canApply: true,
  canUndo: true,
  canRedo: true,
  dirtyFileCount: 1,
  pendingOperationCount: 0,
};
const p1 = planUIBuilderUXControls(base);
const p2 = planUIBuilderUXControls(base);
assert.equal(p1.uxControlPlanId, p2.uxControlPlanId);
assert.equal(p1.actionAvailability.dryRun.enabled, true);
assert.equal(p1.actionAvailability.apply.enabled, true);
assert.equal(planUIBuilderUXControls({ ...base, sourceSyncStatus: "simulated" }).actionAvailability.apply.enabled, true);
assert.equal(planUIBuilderUXControls({ ...base, canApply: false }).actionAvailability.apply.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, sourceSyncStatus: "idle" }).actionAvailability.apply.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, sourceSyncStatus: "applyBlocked" }).actionAvailability.apply.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, hasPendingMutation: true }).actionAvailability.dryRun.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, activeMode: "directManipulation" }).actionAvailability.directManipulation.enabled, true);
assert.equal(planUIBuilderUXControls({ ...base, activeMode: "directManipulation", hasPendingMutation: true }).actionAvailability.directManipulation.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, activeMode: "appStructure" }).actionAvailability.appStructure.enabled, true);
assert.equal(planUIBuilderUXControls({ ...base, activeMode: "appStructure", hasPendingMutation: true }).actionAvailability.appStructure.enabled, false);
assert.equal(planUIBuilderUXControls({ ...base, selectedNodeId: undefined }).actionAvailability.inspect.enabled, false);
const unknown = planUIBuilderUXControls({ ...base, activeMode: "mystery" });
assert.equal(unknown.requiresManualReview, true);
assert(unknown.issues.some((i) => i.code === "unknown_active_mode"));
assert.equal(planUIBuilderUXControls({ ...base, hasValidationErrors: true }).requiresManualReview, true);
assert.equal(planUIBuilderUXControls({ ...base, reliabilityRepairPlan: { requiresManualReview: true } }).requiresManualReview, true);
const highRisk = planUIBuilderUXControls({ ...base, scalabilityPlan: { riskLevel: "high" } });
assert(highRisk.debouncePlan.commandPreviewMs > 250);
assert(highRisk.debouncePlan.recommendations.join(" ").includes("chunked"));
const keys = p1.shortcuts.map((s) => s.key).join("|");
assert(keys.includes("cmd/ctrl+enter"));
assert(keys.includes("cmd/ctrl+shift+enter"));
assert(keys.includes("escape"));
assert(keys.includes("cmd/ctrl+z"));
assert(keys.includes("cmd/ctrl+shift+z"));
assert(keys.includes("slash"));
const recovery = planUIBuilderUXControls({ ...base, hasValidationErrors: true, scalabilityPlan: { riskLevel: "high" }, reliabilityRepairPlan: { requiresManualReview: true }, lastError: "patch conflict" });
assert(recovery.recoveryMessages.some((m) => m.message.includes("Fix validation errors before applying.")));
assert(recovery.recoveryMessages.some((m) => m.message.includes("Large app mode active; use chunked previews before applying.")));
assert(recovery.recoveryMessages.some((m) => m.message.includes("Repair plan requires manual review before apply.")));
assert(recovery.recoveryMessages.some((m) => m.message.includes("patch conflict")));
assert.doesNotThrow(() => planUIBuilderUXControls({}));
const malformed = planUIBuilderUXControls({} as any);
assert.equal(malformed.requiresManualReview, true);
assert(malformed.issues.length > 0 || malformed.blockedReasons.length > 0);
console.log("uiBuilderUXControlPlanner.test.ts passed");
