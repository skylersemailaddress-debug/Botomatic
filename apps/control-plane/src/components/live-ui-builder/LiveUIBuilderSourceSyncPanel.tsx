"use client";

type SourceSyncPanelProps = {
  sourceSyncResult?: any;
  sourceSyncStatus?: string;
  hasRealFileAdapter?: boolean;
  rollbackAvailable?: boolean;
  rollbackStatus?: string;
  adapterDisabledReason?: string;
  sourceSyncDryRun?: () => unknown;
  sourceSyncApply?: () => unknown;
  sourceRollbackDryRun?: () => unknown;
  appStructure?: any;
  latestResult?: any;
};

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="live-ui-builder-metric"><span>{label}</span><strong>{String(value)}</strong></div>;
}

export function LiveUIBuilderSourceSyncPanel(props: SourceSyncPanelProps) {
  const status = props.sourceSyncStatus ?? "idle";
  const changedFiles = props.sourceSyncResult?.patchSummary?.changedFiles ?? props.sourceSyncResult?.patch?.changedFiles ?? [];
  const blockedReasons = props.sourceSyncResult?.blockedReasons ?? [];
  const hasRealFileAdapter = Boolean(props.hasRealFileAdapter);
  return (
    <section className="live-ui-builder-source-sync-panel" aria-label="Live UI Builder source sync and proof status">
      <header>
        <h4>Dry Run Source Sync</h4>
        <p>AST-aware dry run caveat: previewed source changes are deterministic planning artifacts until a server-side adapter confirms scoped local writes.</p>
      </header>
      <Metric label="Source sync status" value={status} />
      <Metric label="Changed file count" value={changedFiles.length} />
      <Metric label="Blocked quality reason" value={blockedReasons.length} />
      <Metric label="hasRealFileAdapter" value={hasRealFileAdapter} />
      <p>Apply requires real file adapter and project-root scoped confirmation.</p>
      <button type="button" onClick={() => props.sourceSyncDryRun?.()}>Run guarded dry run</button>
      <button type="button" disabled={!hasRealFileAdapter} onClick={() => props.sourceSyncApply?.()}>Confirm guarded local write apply</button>
      <p>{props.adapterDisabledReason ?? "Apply requires real file adapter"}</p>
      <p>{props.rollbackStatus ?? "Rollback requires server-side local adapter."}</p>
      <p>Rollback requires server-side local adapter.</p>

      <section>
        <h5>Source identity</h5>
        <Metric label="Confidence:" value="best-effort" />
        <Metric label="Source kinds:" value="typescript, tsx, css" />
        <Metric label="Identity coverage:" value="tracked nodes with sourceIdentityId" />
        <p>Parser-backed source identity is best-effort and does not guarantee semantic runtime equivalence.</p>
      </section>

      <section>
        <h5>App structure/build map</h5>
        <p>Route files to create are planned from app structure commands and remain blocked until source sync is explicitly confirmed.</p>
      </section>

      <section>
        <h5>Multi-file planning</h5>
        <Metric label="Multi-file plan id" value={props.latestResult?.workflowResult?.sourceSyncPlan?.multiFilePlanId ?? "not-created"} />
        <Metric label="Changed file count" value={changedFiles.length} />
        <Metric label="Dependency count" value={props.latestResult?.workflowResult?.sourceSyncPlan?.dependencies?.length ?? 0} />
        <Metric label="Risk level" value="manual-review" />
        <p>Multi-file planning is dry-run only and does not write files or prove runtime correctness.</p>
      </section>

      <section>
        <h5>Full project generation</h5>
        <Metric label="Full project plan id" value="full-project-not-run" />
        <Metric label="Project slug:" value="blocked-until-real-project" />
        <Metric label="Project framework:" value="next" />
        <Metric label="Generated file count:" value={0} />
        <Metric label="Directory count:" value={0} />
        <Metric label="Conflict count:" value={0} />
        <Metric label="Normalization issue count:" value={0} />
        <Metric label="Project risk level:" value="blocked" />
        <Metric label="Project ordered files preview:" value="unavailable until dry-run plan exists" />
        <p>Full project generation is dry-run only and does not write files, install dependencies, deploy, or prove runtime correctness.</p>
      </section>

      <section>
        <h5>Design system</h5>
        <Metric label="Style plan id:" value="style-plan-not-run" />
        <Metric label="Style token count:" value={0} />
        <Metric label="Style variables preview:" value="blocked until token plan exists" />
        <p>Design token planning is dry-run only and does not apply styles, write files, or prove visual/runtime correctness.</p>
      </section>

      <section>
        <h5>Data/state/API wiring</h5>
        <Metric label="Data/State/API wiring plan id:" value="wiring-plan-not-run" />
        <Metric label="Data binding count:" value={0} />
        <Metric label="State binding count:" value={0} />
        <Metric label="State action count:" value={0} />
        <Metric label="API endpoint count:" value={0} />
        <Metric label="API request binding count:" value={0} />
        <Metric label="Affected node count:" value={0} />
        <Metric label="Affected file count:" value={changedFiles.length} />
        <Metric label="Wiring risk level:" value="blocked" />
        <Metric label="Wiring blocked reason count:" value={blockedReasons.length} />
        <p>Data/state/API wiring planning is dry-run only and does not execute requests, write files, deploy, or prove runtime correctness.</p>
      </section>

      <section>
        <h5>Reliability repair</h5>
        <Metric label="Repair plan id" value="repair-plan-not-run" />
        <Metric label="Repair failure count" value={0} />
        <Metric label="Repair selected strategy count" value={0} />
        <Metric label="Repair attempt count" value={0} />
        <Metric label="Repair max attempts" value={3} />
        <Metric label="Repair next attempt index" value={0} />
        <Metric label="Repair rollback required" value="true" />
        <Metric label="Repair rollback proof required" value="true" />
        <Metric label="Repair risk level" value="manual-review" />
        <Metric label="Repair manual review required" value="true" />
        <Metric label="Repair blocked reason count" value={blockedReasons.length} />
        <Metric label="Repair strategies preview" value="parse-error, type-error, patch-conflict" />
        <p>Reliability repair planning is dry-run only and does not write files, execute builds, deploy, or prove runtime correctness.</p>
      </section>

      <section>
        <h5>Scalability and performance</h5>
        <Metric label="Scalability plan id" value="scalability-plan-not-run" />
        <Metric label="Scalability changed file count" value={changedFiles.length} />
        <Metric label="Scalability operation count" value={0} />
        <Metric label="Scalability chunk count" value={0} />
        <Metric label="Scalability avg chunk size" value={0} />
        <Metric label="Scalability max chunk size" value={0} />
        <Metric label="Scalability risk level" value="blocked" />
        <Metric label="Scalability manual review required" value="true" />
        <p>Scalability/performance planning is dry-run only and does not write files, deploy, or prove runtime correctness.</p>
      </section>

      <section>
        <h5>UX controls</h5>
        <Metric label="UX control plan id" value="ux-control-not-run" />
        <Metric label="UX controls enabled" value="dryRun" />
        <Metric label="UX controls disabled" value="apply" />
        <Metric label="UX recovery message count" value={blockedReasons.length} />
        <p>Builder UX control planning is dry-run only and does not mutate UI, write files, deploy, or prove runtime performance.</p>
      </section>

      <section>
        <h5>Export/deploy readiness</h5>
        <Metric label="Export deploy plan id:" value="export-deploy-not-run" />
        <Metric label="Bundle file count:" value={changedFiles.length} />
        <Metric label="Live deploy blocked:" value="true" />
        <p>Export/deploy planning is dry-run only and does not build, package, upload, deploy, write files, create URLs, or prove runtime correctness.</p>
      </section>

      <section>
        <h5>Platform builder readiness</h5>
        <Metric label="Platform builder plan id:" value="platform-builder-not-run" />
        <Metric label="Platform target:" value="web" />
        <p>Platform builder planning is dry-run only and does not build, package, upload, publish, open emulators, call platform APIs, create marketplace pages, or prove runtime/platform approval.</p>
      </section>

      <section>
        <h5>Live builder orchestration</h5>
        <Metric label="Orchestration plan id:" value="orchestration-not-run" />
        <Metric label="Orchestration stage count:" value={0} />
        <Metric label="Orchestration dependency count:" value={0} />
        <Metric label="Orchestration gate count:" value={0} />
        <Metric label="Orchestration executionBlocked:" value="true" />
        <p>Live Builder orchestration is dry-run only and does not execute source writes, export, deploy, or platform publication.</p>
      </section>
    </section>
  );
}
