"use client";

type SourceSyncPanelProps = {
  sourceSyncStatus: "idle" | "dryRunReady" | "applyBlocked" | "applied";
  sourceSyncResult?: { patchSummary?: { changedFiles: string[]; operationCount: number; manualReviewCount: number }; blockedReasons?: string[]; caveat?: string };
  onDryRun: () => void;
  onApply: () => void;
  canApply: boolean;
};

export function LiveUIBuilderSourceSyncPanel({ sourceSyncStatus, sourceSyncResult, onDryRun, onApply, canApply }: SourceSyncPanelProps) {
  const changedFiles = sourceSyncResult?.patchSummary?.changedFiles ?? [];
  const manualReviewCount = sourceSyncResult?.patchSummary?.manualReviewCount ?? 0;
  const blockedReasons = sourceSyncResult?.blockedReasons ?? [];
  return (
    <section className="vibe-rail-card" aria-label="Live UI source sync panel">
      <h3>Source Sync</h3>
      <p>Source sync is guarded. It does not deploy, export, or prove runtime correctness.</p>
      <p>Status: {sourceSyncStatus}</p>
      <p>Operations: {sourceSyncResult?.patchSummary?.operationCount ?? 0}</p>
      <p>Manual review items: {manualReviewCount}</p>
      <ul>{changedFiles.map((f) => <li key={f}>{f}</li>)}</ul>
      {blockedReasons.length ? <ul>{blockedReasons.map((reason) => <li key={reason}>Blocked: {reason}</li>)}</ul> : <p>Apply check: passed</p>}
      <button type="button" onClick={onDryRun}>Dry Run Source Sync</button>
      <button type="button" onClick={onApply} disabled={!canApply}>Apply Source Patch</button>
      <small>{sourceSyncResult?.caveat ?? "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness."}</small>
    </section>
  );
}
