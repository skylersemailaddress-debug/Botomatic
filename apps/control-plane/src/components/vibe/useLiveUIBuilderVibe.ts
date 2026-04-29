import { useMemo, useState } from "react";
import { applyUIEditWorkflow, applyUIAppStructureCommand, applyUISourcePatch, confirmUIPreviewPendingEdit, createUIAppStructureFromDocument, createUIPreviewInteractionFixture, createUIPreviewInteractionState, createUISourceFileMapping, createUISourcePatchFromSyncPlan, handleUIPreviewChatEdit, parseUIAppStructureCommand, rejectUIPreviewPendingEdit, validateUISourceRoundTrip } from "../../../../../packages/ui-preview-engine/src";

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
  const getPreConfirmDiff = () => {
    const pendingCommand = state.pendingReview?.command;
    if (!pendingCommand || !state.pendingReview?.required) return undefined;
    const replaySelection = state.pendingReview?.selectionSnapshot ?? state.selection;
    return applyUIEditWorkflow(state.editableDocument, pendingCommand, { confirmed: true, selection: replaySelection, history: state.history, now: fixture.now })?.diff;
  };
  return { getState: () => state, getLatestResult: () => latestResult, getLatestReviewPayload: () => latestReviewPayload, runSampleEdit, runDestructiveEdit, confirmPending, rejectPending, selectNode, getPreConfirmDiff };
}

export function useLiveUIBuilderVibe() {
  const fixture = createUIPreviewInteractionFixture();
  const [interactionState, setInteractionState] = useState(() => createUIPreviewInteractionState(fixture.doc));
  const [latestResult, setLatestResult] = useState<any>();
  const [latestReviewPayload, setLatestReviewPayload] = useState<any>();
  const [lastCommandText, setLastCommandText] = useState<string>("");
  const [sourceSyncResult, setSourceSyncResult] = useState<any>();
  const [sourceSyncStatus, setSourceSyncStatus] = useState<"idle"|"dryRunReady"|"applyBlocked"|"simulated">("idle");
  const hasRealFileAdapter = false;

  const applyResult = (result: any) => {
    setLatestResult(result);
    setLatestReviewPayload(result.reviewPayload);
    setInteractionState(result.nextState);
  };

  const sourceSyncDryRun = (stateOverride = interactionState, resultOverride = latestResult) => {
    const plan = resultOverride?.workflowResult?.sourceSyncPlan;
    if (!plan) return { ok: false };
    const mapping = createUISourceFileMapping(stateOverride.editableDocument);
    const patch = createUISourcePatchFromSyncPlan(plan, mapping);
    const applyResult = applyUISourcePatch(patch, { readFile: () => "", writeFile: () => undefined, exists: () => false }, { mode: "dryRun", projectRoot: "." });
    const roundTrip = validateUISourceRoundTrip(stateOverride.editableDocument, patch, { readFile: () => "", writeFile: () => undefined, exists: () => false });
    const result = { sourceSyncPlan: plan, patch, patchSummary: { changedFiles: patch.changedFiles, operationCount: patch.operations.length, manualReviewCount: patch.operations.filter((o: any) => o.kind === "manualReviewRequired").length }, blockedReasons: applyResult.blockedReasons, roundTrip, caveat: patch.caveat };
    setSourceSyncResult(result);
    setSourceSyncStatus(applyResult.blockedReasons.length ? "applyBlocked" : "dryRunReady");
    return { ok: true, result };
  };

  const sourceSyncApply = (_confirmationMarker?: boolean) => {
    const blockedReasons = ["Apply requires real file adapter"];
    setSourceSyncStatus("applyBlocked");
    setSourceSyncResult((current: any) => ({ ...(current ?? {}), applyResult: { ok: false, mode: "dryRun", writesPerformed: 0, changedFiles: current?.patch?.changedFiles ?? [], blockedReasons }, blockedReasons }));
    return { ok: false, blockedReasons, writesPerformed: 0 };
  };

  const runSampleEdit = () => applyResult(handleUIPreviewChatEdit({ text: 'rewrite this headline to "Elevated Luxury Stays"', source: "typedChat", selectedNodeId: interactionState.selection.selectedNodeId ?? fixture.node, now: fixture.now }, interactionState));
  const runDestructiveEdit = () => applyResult(handleUIPreviewChatEdit({ text: "remove this", source: "spokenChat", selectedNodeId: interactionState.selection.selectedNodeId ?? fixture.node, now: fixture.now }, interactionState));
  const runCommandText = (text: string) => { setLastCommandText(text); const result = handleUIPreviewChatEdit({ text, source: "typedChat", selectedNodeId: interactionState.selection.selectedNodeId ?? fixture.node, now: fixture.now }, interactionState); applyResult(result); if (result.status === "invalid") return { ok: false, error: "Could not parse command." }; return { ok: true }; };
  const retryLastCommand = () => runCommandText(lastCommandText);
  const resolveTarget = (nodeId: string) => { selectNode(nodeId); return retryLastCommand(); };
  const pendingResolution = latestResult?.status === "needsResolution" ? { candidates: ((latestResult?.workflowResult?.mutationResult?.issues ?? []).flatMap((issue: any) => issue?.candidateNodeIds ?? []) as string[]) } : undefined;
  const confirmPending = () => applyResult(confirmUIPreviewPendingEdit(interactionState, { now: fixture.now, confirmationMarker: true }));
  const rejectPending = () => applyResult(rejectUIPreviewPendingEdit(interactionState));
  const selectNode = (nodeId: string) => setInteractionState((current) => ({ ...current, selection: { ...current.selection, selectedNodeId: nodeId } }));
  const pendingCommand = interactionState.pendingReview?.command;
  const preConfirmDiff = useMemo(() => { if (!pendingCommand || !interactionState.pendingReview?.required) return undefined; const replaySelection = interactionState.pendingReview?.selectionSnapshot ?? interactionState.selection; return applyUIEditWorkflow(interactionState.editableDocument, pendingCommand, { confirmed: true, selection: replaySelection, history: interactionState.history, now: fixture.now }); }, [fixture.now, interactionState.editableDocument, interactionState.history, interactionState.pendingReview?.required, interactionState.selection, pendingCommand]);


  const appStructure = useMemo(() => createUIAppStructureFromDocument(interactionState.editableDocument), [interactionState.editableDocument]);
  const runAppStructureCommand = (text: string) => { const parsed = parseUIAppStructureCommand(text); if (parsed.status !== "ok") return parsed; const result = applyUIAppStructureCommand(interactionState.editableDocument, parsed.command as any, { idSeed: "vibe", selectedNodeId: interactionState.selection.selectedNodeId }); if (result.status === "applied") setInteractionState((c) => ({ ...c, editableDocument: result.document, selection: { ...c.selection, selectedPageId: result.changedPageIds[0] ?? c.selection.selectedPageId } } as any)); return result; };
  const selectPage = (pageId: string) => setInteractionState((current:any) => ({ ...current, selection: { ...current.selection, selectedPageId: pageId } }));
  const duplicatePage = (pageId: string) => runAppStructureCommand(`duplicate the ${pageId} page`);
  const renamePage = (pageId: string, title: string) => runAppStructureCommand(`rename ${pageId} to ${title}`);
  const addPage = (title: string) => runAppStructureCommand(`add a ${title} page`);
  const updateNavigation = (entry: string) => runAppStructureCommand(`add ${entry} to the nav`);
  const extractReusableComponent = (nodeId: string) => { const res = applyUIAppStructureCommand(interactionState.editableDocument, { type: "extractComponent", nodeRef: nodeId }, { selectedNodeId: nodeId, idSeed: "vibe" } as any); if (res.status === "applied") setInteractionState((c)=>({ ...c, editableDocument: res.document })); return res; };
  const reuseComponent = (componentId: string, pageId: string) => { const res = applyUIAppStructureCommand(interactionState.editableDocument, { type: "reuseComponent", componentRef: componentId, pageRef: pageId } as any, { idSeed: "vibe" }); if (res.status === "applied") setInteractionState((c)=>({ ...c, editableDocument: res.document })); return res; };
  const userFacingSummary = latestResult?.userFacingSummary ?? latestResult?.workflowResult?.summary ?? "No edits applied yet.";
  const confirmationPending = Boolean(interactionState.pendingReview?.required);
  const changedNodeIds = latestResult?.previewPatch?.operations?.map((op: any) => op.nodeId).filter(Boolean) ?? [];

  return { latestResult, latestReviewPayload, userFacingSummary, confirmationPending, runSampleEdit, runDestructiveEdit, runCommandText, retryLastCommand, resolveTarget, pendingResolution, confirmPending, rejectPending, interactionState, editableDocument: interactionState.editableDocument, selectedNodeId: interactionState.selection.selectedNodeId, selectNode, lastPreviewPatch: interactionState.lastPreviewPatch, changedNodeIds, preConfirmDiff, pendingReview: interactionState.pendingReview, sourceSyncDryRun, sourceSyncApply, sourceSyncResult, sourceSyncStatus, hasRealFileAdapter, appStructure, runAppStructureCommand, selectPage, duplicatePage, renamePage, addPage, updateNavigation, extractReusableComponent, reuseComponent };
}
