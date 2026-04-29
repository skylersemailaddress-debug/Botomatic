import { useState } from "react";
import { confirmUIPreviewPendingEdit, createUIPreviewInteractionFixture, createUIPreviewInteractionState, handleUIPreviewChatEdit, rejectUIPreviewPendingEdit } from "../../../../../packages/ui-preview-engine/src";

export function createVibeInteractionHarness() {
  const fixture = createUIPreviewInteractionFixture();
  let state = createUIPreviewInteractionState(fixture.doc);
  let latestResult: any;
  let latestReviewPayload: any;
  const applyResult = (result: any) => { latestResult = result; latestReviewPayload = result.reviewPayload; state = result.nextState; return result; };
  const runSampleEdit = () => applyResult(handleUIPreviewChatEdit({ text: 'rewrite this headline to "Elevated Luxury Stays"', source: "typedChat", selectedNodeId: fixture.node, now: fixture.now }, state));
  const runDestructiveEdit = () => applyResult(handleUIPreviewChatEdit({ text: "remove this", source: "spokenChat", selectedNodeId: fixture.node, now: fixture.now }, state));
  const confirmPending = () => applyResult(confirmUIPreviewPendingEdit(state, { now: fixture.now, confirmationMarker: true }));
  const rejectPending = () => applyResult(rejectUIPreviewPendingEdit(state));
  const selectNode = (nodeId: string) => { state = { ...state, selection: { ...state.selection, selectedNodeId: nodeId } }; };
  return { getState: () => state, getLatestResult: () => latestResult, getLatestReviewPayload: () => latestReviewPayload, runSampleEdit, runDestructiveEdit, confirmPending, rejectPending, selectNode };
}

export function useLiveUIBuilderVibe() {
  const fixture = createUIPreviewInteractionFixture();
  const [interactionState, setInteractionState] = useState(() => createUIPreviewInteractionState(fixture.doc));
  const [latestResult, setLatestResult] = useState<any>();
  const [latestReviewPayload, setLatestReviewPayload] = useState<any>();

  const applyResult = (result: any) => {
    setLatestResult(result);
    setLatestReviewPayload(result.reviewPayload);
    setInteractionState(result.nextState);
  };

  const runSampleEdit = () => applyResult(handleUIPreviewChatEdit({ text: 'rewrite this headline to "Elevated Luxury Stays"', source: "typedChat", selectedNodeId: interactionState.selection.selectedNodeId ?? fixture.node, now: fixture.now }, interactionState));
  const runDestructiveEdit = () => applyResult(handleUIPreviewChatEdit({ text: "remove this", source: "spokenChat", selectedNodeId: interactionState.selection.selectedNodeId ?? fixture.node, now: fixture.now }, interactionState));
  const confirmPending = () => applyResult(confirmUIPreviewPendingEdit(interactionState, { now: fixture.now, confirmationMarker: true }));
  const rejectPending = () => applyResult(rejectUIPreviewPendingEdit(interactionState));
  const selectNode = (nodeId: string) => setInteractionState((current) => ({ ...current, selection: { ...current.selection, selectedNodeId: nodeId } }));

  const userFacingSummary = latestResult?.userFacingSummary ?? latestResult?.workflowResult?.summary ?? "No edits applied yet.";
  const confirmationPending = Boolean(interactionState.pendingReview?.required);
  const changedNodeIds = latestResult?.previewPatch?.operations?.map((op: any) => op.nodeId).filter(Boolean) ?? [];

  return { latestResult, latestReviewPayload, userFacingSummary, confirmationPending, runSampleEdit, runDestructiveEdit, confirmPending, rejectPending, interactionState, editableDocument: interactionState.editableDocument, selectedNodeId: interactionState.selection.selectedNodeId, selectNode, lastPreviewPatch: interactionState.lastPreviewPatch, changedNodeIds };
}
