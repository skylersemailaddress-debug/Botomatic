import { useMemo, useState } from "react";

type VibeResult = { userFacingSummary?: string; workflowResult?: { summary?: string }; reviewPayload?: any; pendingReview?: { required?: boolean } };

export function useLiveUIBuilderVibe() {
  const [latestResult, setLatestResult] = useState<VibeResult | undefined>();
  const [latestReviewPayload, setLatestReviewPayload] = useState<any>();

  const applyResult = (result: VibeResult) => {
    setLatestResult(result);
    if (result.reviewPayload) setLatestReviewPayload(result.reviewPayload);
  };

  const userFacingSummary = useMemo(
    () => latestResult?.userFacingSummary ?? latestResult?.workflowResult?.summary ?? "No edits applied yet.",
    [latestResult]
  );

  const confirmationPending = Boolean(latestResult?.pendingReview?.required);

  return { latestResult, latestReviewPayload, userFacingSummary, confirmationPending, applyResult };
}
