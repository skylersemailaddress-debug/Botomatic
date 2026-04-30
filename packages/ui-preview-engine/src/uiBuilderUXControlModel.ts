export type UIBuilderUXRisk = "low" | "medium" | "high";

export type UIBuilderUXActionKey =
  | "dryRun"
  | "apply"
  | "undo"
  | "redo"
  | "inspect"
  | "directManipulation"
  | "appStructure";

export type UIBuilderUXControlState = {
  key: UIBuilderUXActionKey;
  enabled: boolean;
  reason?: string;
};

export type UIBuilderUXActionAvailability = Record<UIBuilderUXActionKey, { enabled: boolean; reason?: string }>;

export type UIBuilderUXShortcut = {
  key: string;
  label: string;
  action: UIBuilderUXActionKey | "clearSelection" | "focusCommandInput";
  enabled: boolean;
  reason?: string;
};

export type UIBuilderUXPendingState = {
  isBusy: boolean;
  label: string;
  pendingMutation: boolean;
  pendingPreview: boolean;
  pendingOperationCount: number;
};

export type UIBuilderUXDebouncePlan = {
  commandPreviewMs: number;
  directManipulationPreviewMs: number;
  sourceSyncPreviewMs: number;
  recommendations: string[];
};

export type UIBuilderUXUndoRedoState = {
  undoLabel: string;
  redoLabel: string;
  undoEnabled: boolean;
  redoEnabled: boolean;
  undoReason?: string;
  redoReason?: string;
};

export type UIBuilderUXRecoveryMessage = {
  code: string;
  message: string;
};

export type UIBuilderUXIssue = {
  code: string;
  message: string;
  severity: "warning" | "error";
};

export type UIBuilderUXControlInput = {
  sourceSyncStatus: "idle" | "dryRunReady" | "applyBlocked" | "simulated" | string;
  selectedNodeId?: string;
  activeMode: "chat" | "inspect" | "directManipulation" | "appStructure" | "sourceSync" | "review" | "idle" | string;
  commandText?: string;
  hasPendingMutation: boolean;
  hasPendingPreview: boolean;
  hasUnappliedChanges: boolean;
  hasValidationErrors: boolean;
  canApply: boolean;
  canUndo: boolean;
  canRedo: boolean;
  dirtyFileCount: number;
  pendingOperationCount: number;
  lastError?: string;
  lastSuccessfulAction?: string;
  scalabilityPlan?: { riskLevel?: UIBuilderUXRisk; requiresManualReview?: boolean };
  reliabilityRepairPlan?: { requiresManualReview?: boolean; riskLevel?: UIBuilderUXRisk };
  sourcePatchPlan?: { requiresManualReview?: boolean; riskLevel?: UIBuilderUXRisk };
  editHistoryState?: { canUndo?: boolean; canRedo?: boolean };
  directManipulationState?: { selectedHandleId?: string };
  appStructureState?: { selectedPath?: string };
};

export type UIBuilderUXControlPlan = {
  uxControlPlanId: string;
  selectedNodeId?: string;
  activeMode: string;
  controls: UIBuilderUXControlState[];
  actionAvailability: UIBuilderUXActionAvailability;
  shortcuts: UIBuilderUXShortcut[];
  pendingState: UIBuilderUXPendingState;
  debouncePlan: UIBuilderUXDebouncePlan;
  undoRedoState: UIBuilderUXUndoRedoState;
  recoveryMessages: UIBuilderUXRecoveryMessage[];
  blockedReasons: string[];
  riskLevel: UIBuilderUXRisk;
  requiresManualReview: boolean;
  issues: UIBuilderUXIssue[];
  caveat: "Builder UX control planning is deterministic dry-run planning and does not mutate UI, write files, deploy, or prove runtime performance.";
};

export const UI_BUILDER_UX_CAVEAT: UIBuilderUXControlPlan["caveat"] =
  "Builder UX control planning is deterministic dry-run planning and does not mutate UI, write files, deploy, or prove runtime performance.";
