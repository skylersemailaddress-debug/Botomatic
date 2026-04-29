"use client";

type SourceSyncPanelProps = {
  sourceSyncStatus: "idle" | "dryRunReady" | "applyBlocked" | "simulated";
  sourceSyncResult?: { patchSummary?: { changedFiles: string[]; operationCount: number; manualReviewCount: number; confidenceCounts?: Record<string, number>; sourceKinds?: string[]; routeFilesToCreate?: string[]; manualReviewReasons?: string[]; identitySummary?: { coverageCount: number; high: number; medium: number; low: number; stale: number; manualReviewRequired: number; selectedNodeIdentitySummary?: string }; multiFilePlanId?: string; dependencyCount?: number; riskLevel?: "low"|"medium"|"high"; requiresManualReview?: boolean; orderedFiles?: string[]; fullProjectGeneration?: { planId: string; normalizedProjectSlug: string; framework: "next"|"vite-react"|"node-api"|"unknown"; generatedFileCount: number; directoryCount: number; conflictCount: number; normalizationIssueCount: number; riskLevel: "low"|"medium"|"high"; requiresManualReview: boolean; orderedFilePathsPreview: string[]; caveat: string }; stylePlan?: { stylePlanId: string; tokenCount: number; categoriesPresent: string[]; outputMode: "cssVariables"|"tailwindTheme"|"inlinePreview"|"unknown"; targetFilePath?: string; riskLevel: "low"|"medium"|"high"; requiresManualReview: boolean; issueCount: number; cssVariableNames: string[]; caveat: string }; dataStateApiWiring?: { wiringPlanId: string; dataBindingCount: number; stateBindingCount: number; stateActionCount: number; apiEndpointCount: number; apiRequestBindingCount: number; affectedNodeCount: number; affectedFileCount: number; riskLevel: "low"|"medium"|"high"; requiresManualReview: boolean; blockedReasonCount: number; orderedOperationLabels: string[]; caveat: string }; reliabilityRepair?: { repairPlanId: string; failureCount: number; selectedStrategyCount: number; attemptCount: number; maxAttempts: number; nextAttemptIndex: number; rollbackRequired: boolean; rollbackProofRequired: boolean; riskLevel: "low"|"medium"|"high"; requiresManualReview: boolean; blockedReasonCount: number; strategyLabels: string[]; caveat: string } }; blockedReasons?: string[]; caveat?: string };
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
      {!!sourceSyncResult?.patchSummary?.stylePlan && <><p>Style plan id: {sourceSyncResult.patchSummary.stylePlan.stylePlanId}</p>
      <p>Style token count: {sourceSyncResult.patchSummary.stylePlan.tokenCount}</p>
      <p>Style categories: {sourceSyncResult.patchSummary.stylePlan.categoriesPresent.join(", ") || "none"}</p>
      <p>Style output mode: {sourceSyncResult.patchSummary.stylePlan.outputMode}</p>
      <p>Style target file path: {sourceSyncResult.patchSummary.stylePlan.targetFilePath ?? "none"}</p>
      <p>Style risk level: {sourceSyncResult.patchSummary.stylePlan.riskLevel}</p>
      <p>Style manual review required: {String(sourceSyncResult.patchSummary.stylePlan.requiresManualReview)}</p>
      <p>Style issue count: {sourceSyncResult.patchSummary.stylePlan.issueCount}</p>
      <p>Style variables preview: {sourceSyncResult.patchSummary.stylePlan.cssVariableNames.slice(0,10).join(", ") || "none"}</p>
      <p>Design token planning is dry-run only and does not apply styles, write files, or prove visual/runtime correctness.</p></>}

      {!!sourceSyncResult?.patchSummary?.dataStateApiWiring && <><p>Data/State/API wiring plan id: {sourceSyncResult.patchSummary.dataStateApiWiring.wiringPlanId}</p>
      <p>Data binding count: {sourceSyncResult.patchSummary.dataStateApiWiring.dataBindingCount}</p>
      <p>State binding count: {sourceSyncResult.patchSummary.dataStateApiWiring.stateBindingCount}</p>
      <p>State action count: {sourceSyncResult.patchSummary.dataStateApiWiring.stateActionCount}</p>
      <p>API endpoint count: {sourceSyncResult.patchSummary.dataStateApiWiring.apiEndpointCount}</p>
      <p>API request binding count: {sourceSyncResult.patchSummary.dataStateApiWiring.apiRequestBindingCount}</p>
      <p>Affected node count: {sourceSyncResult.patchSummary.dataStateApiWiring.affectedNodeCount}</p>
      <p>Affected file count: {sourceSyncResult.patchSummary.dataStateApiWiring.affectedFileCount}</p>
      <p>Wiring risk level: {sourceSyncResult.patchSummary.dataStateApiWiring.riskLevel}</p>
      <p>Wiring manual review required: {String(sourceSyncResult.patchSummary.dataStateApiWiring.requiresManualReview)}</p>
      <p>Wiring blocked reason count: {sourceSyncResult.patchSummary.dataStateApiWiring.blockedReasonCount}</p>
      <p>Wiring operations preview: {sourceSyncResult.patchSummary.dataStateApiWiring.orderedOperationLabels.slice(0,10).join(", ") || "none"}</p>
      <p>Data/state/API wiring planning is dry-run only and does not execute requests, write files, deploy, or prove runtime correctness.</p></>}

      {!!sourceSyncResult?.patchSummary?.reliabilityRepair && <><p>Repair plan id: {sourceSyncResult.patchSummary.reliabilityRepair.repairPlanId}</p>
      <p>Repair failure count: {sourceSyncResult.patchSummary.reliabilityRepair.failureCount}</p>
      <p>Repair selected strategy count: {sourceSyncResult.patchSummary.reliabilityRepair.selectedStrategyCount}</p>
      <p>Repair attempt count: {sourceSyncResult.patchSummary.reliabilityRepair.attemptCount}</p>
      <p>Repair max attempts: {sourceSyncResult.patchSummary.reliabilityRepair.maxAttempts}</p>
      <p>Repair next attempt index: {sourceSyncResult.patchSummary.reliabilityRepair.nextAttemptIndex}</p>
      <p>Repair rollback required: {String(sourceSyncResult.patchSummary.reliabilityRepair.rollbackRequired)}</p>
      <p>Repair rollback proof required: {String(sourceSyncResult.patchSummary.reliabilityRepair.rollbackProofRequired)}</p>
      <p>Repair risk level: {sourceSyncResult.patchSummary.reliabilityRepair.riskLevel}</p>
      <p>Repair manual review required: {String(sourceSyncResult.patchSummary.reliabilityRepair.requiresManualReview)}</p>
      <p>Repair blocked reason count: {sourceSyncResult.patchSummary.reliabilityRepair.blockedReasonCount}</p>
      <p>Repair strategies preview: {sourceSyncResult.patchSummary.reliabilityRepair.strategyLabels.slice(0,10).join(", ") || "none"}</p>
      <p>Reliability repair planning is dry-run only and does not write files, execute builds, deploy, or prove runtime correctness.</p></>}

      {!!sourceSyncResult?.patchSummary?.fullProjectGeneration && <><p>Full project plan id: {sourceSyncResult.patchSummary.fullProjectGeneration.planId}</p>
      <p>Project slug: {sourceSyncResult.patchSummary.fullProjectGeneration.normalizedProjectSlug}</p>
      <p>Project framework: {sourceSyncResult.patchSummary.fullProjectGeneration.framework}</p>
      <p>Generated file count: {sourceSyncResult.patchSummary.fullProjectGeneration.generatedFileCount}</p>
      <p>Directory count: {sourceSyncResult.patchSummary.fullProjectGeneration.directoryCount}</p>
      <p>Conflict count: {sourceSyncResult.patchSummary.fullProjectGeneration.conflictCount}</p>
      <p>Normalization issue count: {sourceSyncResult.patchSummary.fullProjectGeneration.normalizationIssueCount}</p>
      <p>Project risk level: {sourceSyncResult.patchSummary.fullProjectGeneration.riskLevel}</p>
      <p>Project manual review required: {String(sourceSyncResult.patchSummary.fullProjectGeneration.requiresManualReview)}</p>
      <p>Project ordered files preview: {sourceSyncResult.patchSummary.fullProjectGeneration.orderedFilePathsPreview.slice(0,10).join(", ") || "none"}</p>
      <p>Full project generation is dry-run only and does not write files, install dependencies, deploy, or prove runtime correctness.</p></>}

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
