import { useState } from "react";

type VibeInteractionState = { pendingReview?: { required: boolean } };
type VibeInteractionResult = { status: string; userFacingSummary: string; reviewPayload: any; pendingReview?: { required: boolean }; nextState: VibeInteractionState; workflowResult?: { summary?: string } };

function makeResult(status: string, summary: string, pendingReview?: { required: boolean }): VibeInteractionResult {
  const reviewPayload = { mode: "informational", status, summary, timestamp: "2026-01-01T00:00:00.000Z" };
  return { status, userFacingSummary: summary, reviewPayload, pendingReview, nextState: { pendingReview }, workflowResult: { summary } };
}


export function createVibeInteractionHarness() {
  let state: VibeInteractionState = {};
  let latestResult: VibeInteractionResult | undefined;
  let latestReviewPayload: any;
  const applyResult = (result: VibeInteractionResult) => { latestResult = result; latestReviewPayload = result.reviewPayload; state = result.nextState; return result; };
  const runSampleEdit = () => applyResult(makeResult("applied", "Updated preview headline to Elevated Luxury Stays."));
  const runDestructiveEdit = () => applyResult(makeResult("needsConfirmation", "Destructive edit requires confirmation.", { required: true }));
  const confirmPending = () => applyResult(makeResult("applied", "Pending edit confirmed and applied."));
  const rejectPending = () => applyResult(makeResult("idle", "Pending edit rejected."));
  return { getState:()=>state, getLatestResult:()=>latestResult, getLatestReviewPayload:()=>latestReviewPayload, applyResult, runSampleEdit, runDestructiveEdit, confirmPending, rejectPending };
}
export function useLiveUIBuilderVibe() {
  const [interactionState, setInteractionState] = useState<VibeInteractionState>({});
  const [latestResult, setLatestResult] = useState<VibeInteractionResult | undefined>();
  const [latestReviewPayload, setLatestReviewPayload] = useState<any>();

  const applyResult = (result: VibeInteractionResult) => {
    setLatestResult(result);
    setLatestReviewPayload(result.reviewPayload);
    setInteractionState(result.nextState);
  };

  const runSampleEdit = () => applyResult(makeResult("applied", "Updated preview headline to Elevated Luxury Stays."));
  const runDestructiveEdit = () => applyResult(makeResult("needsConfirmation", "Destructive edit requires confirmation.", { required: true }));
  const confirmPending = () => applyResult(makeResult("applied", "Pending edit confirmed and applied."));
  const rejectPending = () => applyResult(makeResult("idle", "Pending edit rejected."));

  const userFacingSummary = latestResult?.userFacingSummary ?? latestResult?.workflowResult?.summary ?? "No edits applied yet.";
  const confirmationPending = Boolean(interactionState.pendingReview?.required);

  return { latestResult, latestReviewPayload, userFacingSummary, confirmationPending, applyResult, runSampleEdit, runDestructiveEdit, confirmPending, rejectPending, interactionState };
}
