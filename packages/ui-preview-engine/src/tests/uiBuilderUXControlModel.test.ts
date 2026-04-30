import assert from "assert";
import { UI_BUILDER_UX_CAVEAT, type UIBuilderUXControlPlan } from "../uiBuilderUXControlModel";

const plan: UIBuilderUXControlPlan = {
  uxControlPlanId: "ux-control-abc",
  selectedNodeId: "node-1",
  activeMode: "inspect",
  controls: [],
  actionAvailability: { dryRun: { enabled: true }, apply: { enabled: false, reason: "x" }, undo: { enabled: false }, redo: { enabled: false }, inspect: { enabled: true }, directManipulation: { enabled: false }, appStructure: { enabled: false } },
  shortcuts: [],
  pendingState: { isBusy: false, label: "Idle", pendingMutation: false, pendingPreview: false, pendingOperationCount: 0 },
  debouncePlan: { commandPreviewMs: 250, directManipulationPreviewMs: 100, sourceSyncPreviewMs: 400, recommendations: [] },
  undoRedoState: { undoLabel: "Undo", redoLabel: "Redo", undoEnabled: false, redoEnabled: false },
  recoveryMessages: [],
  blockedReasons: [],
  riskLevel: "low",
  requiresManualReview: false,
  issues: [],
  caveat: UI_BUILDER_UX_CAVEAT,
};
assert(plan.caveat.includes("deterministic dry-run planning"));
assert.equal(plan.debouncePlan.commandPreviewMs, 250);
console.log("uiBuilderUXControlModel.test.ts passed");
