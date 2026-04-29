import React from "react";
import type { UIPreviewInteractionState } from "../../../../../packages/ui-preview-engine/src/uiPreviewInteractionState";
import type { UIPreviewReviewPayload } from "../../../../../packages/ui-preview-engine/src/uiPreviewReviewPayload";

type Props = {
  state: UIPreviewInteractionState;
  reviewPayload?: UIPreviewReviewPayload;
  onConfirm: () => void;
  onReject: () => void;
};

export function LiveUIBuilderReviewPanel({ state, reviewPayload, onConfirm, onReject }: Props) {
  const payload = reviewPayload ?? state.pendingReview?.payload;
  return (
    <section aria-label="Live UI Builder Preview" className="vibe-rail-card">
      <header>
        <h3>Live UI Builder Preview</h3>
      </header>
      <p><strong>Status:</strong> {state.status}</p>
      <p><strong>Summary:</strong> {state.lastWorkflowResult?.summary ?? "No interaction submitted yet."}</p>
      <p><strong>Command:</strong> {payload?.commandSummary ?? "No command available"}</p>
      <p><strong>Target:</strong> {payload?.targetSummary ?? "No target"}</p>
      <p><strong>Confirmation required:</strong> {String(payload?.confirmationRequired ?? false)}</p>
      <p><strong>Guardrails:</strong> {payload?.guardrailSummary ?? state.guardrailSummary ?? "guardrails pending"}</p>
      <p><strong>Diff:</strong> {payload?.diffSummary ?? "no diff"}</p>
      <p><strong>Source sync planning:</strong> {payload?.sourceSyncPlanningSummary ?? "planning-only sync summary unavailable"}</p>
      <p><strong>Undo available:</strong> {String(payload?.undoAvailable ?? false)}</p>
      <p><strong>Redo available:</strong> {String(payload?.redoAvailable ?? false)}</p>
      <div>
        <button type="button" onClick={onConfirm}>Confirm</button>
        <button type="button" onClick={onReject}>Reject</button>
      </div>
      <p>
        This panel previews editable UI model changes only. Source sync is planning-only. It does not prove export/launch readiness.
      </p>
    </section>
  );
}
