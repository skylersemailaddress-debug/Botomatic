import { createHash } from "crypto";
import {
  type UIBuilderUXActionAvailability,
  type UIBuilderUXControlInput,
  type UIBuilderUXControlPlan,
  type UIBuilderUXControlState,
  UI_BUILDER_UX_CAVEAT,
} from "./uiBuilderUXControlModel";

const VALID_MODES = new Set(["chat", "inspect", "directManipulation", "appStructure", "sourceSync", "review", "idle"]);

function disabledReason(enabled: boolean, reason: string): string | undefined {
  return enabled ? undefined : reason;
}

export function planUIBuilderUXControls(input: Partial<UIBuilderUXControlInput>): UIBuilderUXControlPlan {
  const issues: UIBuilderUXControlPlan["issues"] = [];
  const selectedNodeId = typeof input.selectedNodeId === "string" ? input.selectedNodeId : undefined;
  const activeMode = typeof input.activeMode === "string" ? input.activeMode : "idle";
  if (!VALID_MODES.has(activeMode)) {
    issues.push({ code: "unknown_active_mode", message: `Unknown active mode: ${activeMode}`, severity: "error" });
  }
  if (typeof input.canApply !== "boolean") {
    issues.push({ code: "malformed_input", message: "Input is malformed; defaulting to fail-closed controls.", severity: "warning" });
  }

  const commandText = (input.commandText ?? "").trim();
  const hasPendingMutation = Boolean(input.hasPendingMutation);
  const canApply = Boolean(input.canApply);
  const canUndo = Boolean(input.canUndo || input.editHistoryState?.canUndo);
  const canRedo = Boolean(input.canRedo || input.editHistoryState?.canRedo);
  const sourceSyncStatus = input.sourceSyncStatus ?? "idle";
  const hasContext = Boolean(selectedNodeId || input.directManipulationState?.selectedHandleId || input.appStructureState?.selectedPath);
  const scalabilityHigh = input.scalabilityPlan?.riskLevel === "high";
  const repairManualReview = Boolean(input.reliabilityRepairPlan?.requiresManualReview);
  const hasValidationErrors = Boolean(input.hasValidationErrors);

  const blockedReasons: string[] = [];
  const applyReadyStatus = sourceSyncStatus === "dryRunReady" || sourceSyncStatus === "simulated";
  if (canApply && !applyReadyStatus) blockedReasons.push("Apply blocked: source sync must be dryRunReady or simulated.");
  if (scalabilityHigh) blockedReasons.push("Apply blocked: high scalability risk requires manual review.");
  if (repairManualReview) blockedReasons.push("Apply blocked: repair plan requires manual review.");
  if (hasValidationErrors) blockedReasons.push("Apply blocked: validation errors must be resolved.");
  if (hasPendingMutation && canApply) blockedReasons.push("Apply blocked: pending mutation must settle before apply.");
  if (!VALID_MODES.has(activeMode)) blockedReasons.push("Apply blocked: unknown active mode.");

  const requiresManualReview = blockedReasons.length > 0 || issues.length > 0;
  const riskLevel = scalabilityHigh ? "high" : input.scalabilityPlan?.riskLevel ?? input.reliabilityRepairPlan?.riskLevel ?? "low";

  const dryRunEnabled = !hasPendingMutation && (commandText.length > 0 || hasContext);
  const applyEnabled = canApply && applyReadyStatus && !requiresManualReview;
  const inspectEnabled = Boolean(selectedNodeId);
  const directEnabled = activeMode === "directManipulation" && Boolean(selectedNodeId) && !hasPendingMutation;
  const appStructureEnabled = activeMode === "appStructure" && !hasPendingMutation;

  const actionAvailability: UIBuilderUXActionAvailability = {
    dryRun: { enabled: dryRunEnabled, reason: disabledReason(dryRunEnabled, "Provide command text or selected context; pending mutation blocks dry run.") },
    apply: { enabled: applyEnabled, reason: disabledReason(applyEnabled, blockedReasons[0] ?? "Apply is not safe yet.") },
    undo: { enabled: canUndo, reason: disabledReason(canUndo, "No undo history available.") },
    redo: { enabled: canRedo, reason: disabledReason(canRedo, "No redo history available.") },
    inspect: { enabled: inspectEnabled, reason: disabledReason(inspectEnabled, "Select a node to inspect controls.") },
    directManipulation: { enabled: directEnabled, reason: disabledReason(directEnabled, "Direct manipulation requires directManipulation mode, a selected node, and no pending mutation.") },
    appStructure: { enabled: appStructureEnabled, reason: disabledReason(appStructureEnabled, "App structure actions require appStructure mode and no pending mutation.") },
  };

  const controls: UIBuilderUXControlState[] = Object.entries(actionAvailability).map(([key, value]) => ({ key: key as UIBuilderUXControlState["key"], enabled: value.enabled, reason: value.reason }));

  const debouncePlan = {
    commandPreviewMs: scalabilityHigh ? 400 : 250,
    directManipulationPreviewMs: scalabilityHigh ? 180 : 100,
    sourceSyncPreviewMs: scalabilityHigh ? 600 : 400,
    recommendations: scalabilityHigh ? ["Use chunked previews before applying.", "Use paginated preview surfaces for large app mode."] : ["Use default preview cadence."],
  };

  const recoveryMessages = [];
  if (hasValidationErrors) recoveryMessages.push({ code: "validation", message: "Fix validation errors before applying." });
  if (scalabilityHigh) recoveryMessages.push({ code: "scalability", message: "Large app mode active; use chunked previews before applying." });
  if (repairManualReview) recoveryMessages.push({ code: "repair-manual-review", message: "Repair plan requires manual review before apply." });
  if (input.lastError) recoveryMessages.push({ code: "last-error", message: `Recover from last error by rerunning dry run and addressing: ${input.lastError}.` });

  const snapshot = JSON.stringify({ sourceSyncStatus, selectedNodeId, activeMode, commandText, hasPendingMutation, canApply, canUndo, canRedo, dirtyFileCount: input.dirtyFileCount ?? 0, pendingOperationCount: input.pendingOperationCount ?? 0, blockedReasons, riskLevel });
  const uxControlPlanId = `ux-control-${createHash("sha256").update(snapshot).digest("hex").slice(0, 16)}`;

  return {
    uxControlPlanId,
    selectedNodeId,
    activeMode,
    controls,
    actionAvailability,
    shortcuts: [
      { key: "cmd/ctrl+enter", label: "Dry run", action: "dryRun", enabled: dryRunEnabled, reason: actionAvailability.dryRun.reason },
      { key: "cmd/ctrl+shift+enter", label: "Apply when safe", action: "apply", enabled: applyEnabled, reason: actionAvailability.apply.reason },
      { key: "escape", label: "Clear selection or close overlay", action: "clearSelection", enabled: true },
      { key: "cmd/ctrl+z", label: "Undo", action: "undo", enabled: canUndo, reason: actionAvailability.undo.reason },
      { key: "cmd/ctrl+shift+z", label: "Redo", action: "redo", enabled: canRedo, reason: actionAvailability.redo.reason },
      { key: "slash", label: "Focus command input", action: "focusCommandInput", enabled: true },
    ],
    pendingState: {
      isBusy: hasPendingMutation || Boolean(input.hasPendingPreview) || (input.pendingOperationCount ?? 0) > 0,
      label: hasPendingMutation ? "Applying mutation" : input.hasPendingPreview ? "Preview pending" : (input.pendingOperationCount ?? 0) > 0 ? "Background planning pending" : "Idle",
      pendingMutation: hasPendingMutation,
      pendingPreview: Boolean(input.hasPendingPreview),
      pendingOperationCount: input.pendingOperationCount ?? 0,
    },
    debouncePlan,
    undoRedoState: {
      undoLabel: "Undo last builder action",
      redoLabel: "Redo last reverted builder action",
      undoEnabled: canUndo,
      redoEnabled: canRedo,
      undoReason: actionAvailability.undo.reason,
      redoReason: actionAvailability.redo.reason,
    },
    recoveryMessages,
    blockedReasons,
    riskLevel,
    requiresManualReview,
    issues,
    caveat: UI_BUILDER_UX_CAVEAT,
  };
}
