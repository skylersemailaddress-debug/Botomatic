"use client";

type SourceSyncPanelProps = {
  sourceSyncStatus: "idle" | "dryRunReady" | "applyBlocked" | "simulated";
  sourceSyncResult?: { patchSummary?: { changedFiles: string[]; operationCount: number; manualReviewCount: number; confidenceCounts?: Record<string, number>; sourceKinds?: string[]; routeFilesToCreate?: string[]; manualReviewReasons?: string[]; identitySummary?: { coverageCount: number; high: number; medium: number; low: number; stale: number; manualReviewRequired: number; selectedNodeIdentitySummary?: string }; multiFilePlanId?: string; dependencyCount?: number; riskLevel?: "low"|"medium"|"high"; requiresManualReview?: boolean; orderedFiles?: string[] }; blockedReasons?: string[]; caveat?: string };
  onDryRun: () => void;
  onApply: () => void;
  canApply: boolean;
  hasRealFileAdapter?: boolean;
  writeSafetyStatus?: string;
  explicitConfirmed?: boolean;
  lastSourceApplyProof?: { caveat?: string; rollbackAvailable?: boolean; rollbackVerified?: boolean };
  rollbackAvailable?: boolean;
  rollbackStatus?: string;
  sourceRollbackDryRun?: { status?: string; reason?: string };
  onExplicitConfirmChange?: (checked: boolean) => void;
};

export function LiveUIBuilderSourceSyncPanel({ sourceSyncStatus, sourceSyncResult, onDryRun, onApply, canApply, hasRealFileAdapter = false, writeSafetyStatus = "writes disabled", explicitConfirmed = false, onExplicitConfirmChange, lastSourceApplyProof, rollbackAvailable = false, rollbackStatus = "Rollback requires server-side local adapter.", sourceRollbackDryRun }: SourceSyncPanelProps) {
  const changedFiles = sourceSyncResult?.patchSummary?.changedFiles ?? [];
  const manualReviewCount = sourceSyncResult?.patchSummary?.manualReviewCount ?? 0;
  const blockedReasons = sourceSyncResult?.blockedReasons ?? [];
  const confidenceCounts = sourceSyncResult?.patchSummary?.confidenceCounts ?? {};
  const sourceKinds = sourceSyncResult?.patchSummary?.sourceKinds ?? [];
  const routeFiles = sourceSyncResult?.patchSummary?.routeFilesToCreate ?? [];
  const identitySummary = sourceSyncResult?.patchSummary?.identitySummary;
  const manualReasons = sourceSyncResult?.patchSummary?.manualReviewReasons ?? [];
  const cleanDryRun = sourceSyncStatus === "dryRunReady" && blockedReasons.length === 0;
  const applyEnabled = canApply && hasRealFileAdapter && cleanDryRun && explicitConfirmed;
  return (<section className="vibe-rail-card" aria-label="Live UI source sync panel">
      <h3>Source Sync</h3>
      <p>Local source writes are guarded and project-root scoped. They do not deploy, export, or prove runtime correctness.</p>
      <p>AST-aware dry run caveat: plans are safety-oriented and may still require manual review.</p>
      <p>Status: {sourceSyncStatus}</p><p>Adapter: {hasRealFileAdapter ? "local" : "none"}</p><p>Write safety: {writeSafetyStatus}</p>
      <p>Operations: {sourceSyncResult?.patchSummary?.operationCount ?? 0}</p><p>Manual review items: {manualReviewCount}</p>
      <p>Confidence: high={confidenceCounts.high ?? 0}, medium={confidenceCounts.medium ?? 0}, low={confidenceCounts.low ?? 0}</p>
      <p>Identity coverage: {identitySummary?.coverageCount ?? 0} (high={identitySummary?.high ?? 0}, medium={identitySummary?.medium ?? 0}, low={identitySummary?.low ?? 0}, stale={identitySummary?.stale ?? 0})</p>
      <p>Identity manual-review required: {identitySummary?.manualReviewRequired ?? 0}</p>
      {!!identitySummary?.selectedNodeIdentitySummary && <p>Selected node identity: {identitySummary.selectedNodeIdentitySummary}</p>}
      <p>Parser-backed source identity is best-effort and does not guarantee semantic runtime equivalence.</p>
      <p>Source kinds: {sourceKinds.join(", ") || "none"}</p>
      {!!routeFiles.length && <p>Route files to create: {routeFiles.join(", ")}</p>}

      <p>Multi-file plan id: {sourceSyncResult?.patchSummary?.multiFilePlanId ?? "none"}</p>
      <p>Changed file count: {changedFiles.length}</p>
      <p>Dependency count: {sourceSyncResult?.patchSummary?.dependencyCount ?? 0}</p>
      <p>Risk level: {sourceSyncResult?.patchSummary?.riskLevel ?? "low"}</p>
      <p>Manual review required: {String(sourceSyncResult?.patchSummary?.requiresManualReview ?? false)}</p>
      <p>Ordered files: {(sourceSyncResult?.patchSummary?.orderedFiles ?? changedFiles).join(", ") || "none"}</p>
      <p>Multi-file planning is dry-run only and does not write files or prove runtime correctness.</p>
      <ul>{changedFiles.map((f) => <li key={f}>{f}</li>)}</ul>
      {!!manualReasons.length && <ul>{manualReasons.map((r) => <li key={r}>Manual review: {r}</li>)}</ul>}
      {blockedReasons.length ? <ul>{blockedReasons.map((reason) => <li key={reason}>Blocked quality reason: {reason}</li>)}</ul> : <p>Dry-run safety: {cleanDryRun ? "clean" : "not-ready"}</p>}
      <label><input type="checkbox" checked={explicitConfirmed} onChange={(e) => onExplicitConfirmChange?.(e.target.checked)} /> Confirm guarded local write apply</label>
      <button type="button" onClick={onDryRun}>Dry Run Source Sync</button>
      <button type="button" onClick={onApply} disabled={!applyEnabled}>{hasRealFileAdapter ? "Apply Source Patch" : "Apply requires real file adapter"}</button>
      <p>Rollback available: {rollbackAvailable ? "yes" : "no"}</p>
      <p>Rollback status: {hasRealFileAdapter ? rollbackStatus : "Rollback requires server-side local adapter."}</p>
      <p>Rollback simulation: {sourceRollbackDryRun?.status ?? "none"}</p>
      <small>{lastSourceApplyProof?.caveat ?? sourceSyncResult?.caveat ?? "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness."}</small>
    </section>);
}
