"use client";

type SourceSyncPanelProps = {
  sourceSyncStatus: "idle" | "dryRunReady" | "applyBlocked" | "simulated";
  sourceSyncResult?: { patchSummary?: { changedFiles: string[]; operationCount: number; manualReviewCount: number }; blockedReasons?: string[]; caveat?: string };
  onDryRun: () => void;
  onApply: () => void;
  canApply: boolean;
  hasRealFileAdapter?: boolean;
  writeSafetyStatus?: string;
  explicitConfirmed?: boolean;
  onExplicitConfirmChange?: (checked: boolean) => void;
};

export function LiveUIBuilderSourceSyncPanel({ sourceSyncStatus, sourceSyncResult, onDryRun, onApply, canApply, hasRealFileAdapter = false, writeSafetyStatus = "writes disabled", explicitConfirmed = false, onExplicitConfirmChange }: SourceSyncPanelProps) {
  const changedFiles = sourceSyncResult?.patchSummary?.changedFiles ?? [];
  const manualReviewCount = sourceSyncResult?.patchSummary?.manualReviewCount ?? 0;
  const blockedReasons = sourceSyncResult?.blockedReasons ?? [];
  const cleanDryRun = sourceSyncStatus === "dryRunReady" && blockedReasons.length === 0;
  const applyEnabled = canApply && hasRealFileAdapter && cleanDryRun && explicitConfirmed;
  return (
    <section className="vibe-rail-card" aria-label="Live UI source sync panel">
      <h3>Source Sync</h3>
      <p>Local source writes are guarded and project-root scoped. They do not deploy, export, or prove runtime correctness.</p>
      <p>Status: {sourceSyncStatus}</p>
      <p>Adapter: {hasRealFileAdapter ? "local" : "none"}</p>
      <p>Write safety: {writeSafetyStatus}</p>
      <p>Operations: {sourceSyncResult?.patchSummary?.operationCount ?? 0}</p>
      <p>Manual review items: {manualReviewCount}</p>
      <ul>{changedFiles.map((f) => <li key={f}>{f}</li>)}</ul>
      {blockedReasons.length ? <ul>{blockedReasons.map((reason) => <li key={reason}>Blocked: {reason}</li>)}</ul> : <p>Dry-run safety: {cleanDryRun ? "clean" : "not-ready"}</p>}
      <label>
        <input type="checkbox" checked={explicitConfirmed} onChange={(e) => onExplicitConfirmChange?.(e.target.checked)} /> Confirm guarded local write apply
      </label>
      <button type="button" onClick={onDryRun}>Dry Run Source Sync</button>
      <button type="button" onClick={onApply} disabled={!applyEnabled}>{hasRealFileAdapter ? "Apply Source Patch" : "Apply requires real file adapter"}</button>
      <small>{sourceSyncResult?.caveat ?? "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness."}</small>
    </section>
  );
}
