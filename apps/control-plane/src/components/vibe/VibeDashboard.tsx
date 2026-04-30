"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { actionChips, recentProjects, suggestionChips, vibeSidebarNav } from "./vibeSeedData";
import { LiveUIBuilderCommandInput } from "../live-ui-builder/LiveUIBuilderCommandInput";
import { LiveUIBuilderDiffPreview } from "../live-ui-builder/LiveUIBuilderDiffPreview";
import { LiveUIBuilderResolutionPanel, type ResolutionTarget } from "../live-ui-builder/LiveUIBuilderResolutionPanel";
import { LiveUIBuilderPreviewSurface } from "./LiveUIBuilderPreviewSurface";
import { LiveUIBuilderSourceSyncPanel } from "../live-ui-builder/LiveUIBuilderSourceSyncPanel";
import { LiveUIBuilderAppStructurePanel } from "../live-ui-builder/LiveUIBuilderAppStructurePanel";
import { VibeOrchestrationPanel } from "../builder/VibeOrchestrationPanel";
import { useVibeOrchestration } from "../builder/useVibeOrchestration";
import { useLiveUIBuilderVibe } from "./useLiveUIBuilderVibe";
import { VibeLivePreviewPanel } from "@/components/runtime/RuntimePreviewPanel";
import { getProjectRuntimeState } from "@/services/runtimeStatus";
import { getFirstRunFallback, getFirstRunState, type FirstRunState } from "@/services/firstRun";

export function VibeDashboard({ projectId }: { projectId: string }) {
  const { latestResult, userFacingSummary, latestReviewPayload, confirmationPending, runSampleEdit, runDestructiveEdit, runCommandText, retryLastCommand, resolveTarget, pendingResolution, confirmPending, rejectPending, editableDocument, selectedNodeId, selectedPageId, changedNodeIds, lastPreviewPatch, selectNode, runDirectManipulationAction, preConfirmDiff, sourceSyncDryRun, sourceSyncApply, sourceSyncResult, sourceSyncStatus, hasRealFileAdapter, appStructure, appStructureNeedsResolution, appStructureCandidates, selectPage, duplicatePage, renamePage, updateNavigation, extractReusableComponent, reuseComponent } = useLiveUIBuilderVibe();
  const fallbackTargets: ResolutionTarget[] = Object.values(editableDocument.pages?.[0]?.nodes ?? {}).slice(0, 8).map((node: any) => ({ nodeId: node.id, label: node.identity?.semanticLabel ?? node.id, type: node.kind ?? "node", page: editableDocument.pages?.[0]?.id ?? "page", location: node.parentId ? `child of ${node.parentId}` : "root" }));
  const resolverTargets: ResolutionTarget[] = (pendingResolution?.candidates ?? []).map((nodeId: string) => ({ nodeId, label: nodeId, type: "resolver candidate", page: editableDocument.pages.find((page: any) => page.nodes[nodeId])?.id ?? "unknown", location: "resolver" }));
  const [runtimeState, setRuntimeState] = useState<{ status?: string; previewUrl?: string }>({});
  const [firstRunState, setFirstRunState] = useState<FirstRunState>(getFirstRunFallback(projectId));
  const [firstRunMessage, setFirstRunMessage] = useState<string>("No first-run state yet");
  useEffect(() => {
    let active = true;
    Promise.all([getProjectRuntimeState(projectId), getFirstRunState(projectId)]).then(([runtime, firstRun]) => {
      if (!active) return;
      setRuntimeState(runtime);
      if (firstRun.ok) {
        setFirstRunState(firstRun.data);
        setFirstRunMessage("");
      } else {
        setFirstRunState(getFirstRunFallback(projectId));
        setFirstRunMessage(firstRun.message || "No first-run state yet");
      }
    }).catch(() => { if (active) { setRuntimeState({}); setFirstRunState(getFirstRunFallback(projectId)); setFirstRunMessage("No first-run state yet"); } });
    return () => { active = false; };
  }, [projectId]);
  const orchestration = useVibeOrchestration(projectId);
  return (
    <section className="vibe-dashboard" aria-label="Vibe dashboard" data-project-id={projectId}>
      <aside className="vibe-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="vibe-dashboard-brand">
          <span className="vibe-dashboard-brand-icon">⬢</span>
          <span>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <Link href="/" className="vibe-dashboard-new-project">+ New Project</Link>

        <nav className="vibe-dashboard-nav" aria-label="Dashboard navigation">
          {vibeSidebarNav.map((item) => <button type="button" key={item} className={item === "Home" ? "is-active" : ""}>{item}</button>)}
        </nav>

        <div className="vibe-dashboard-card">
          <h3>Recent Projects</h3><small>Static list</small>
          {recentProjects.map((project) => (
            <div key={project.name} className="vibe-dashboard-row">
              <span>{project.name}</span>
              <small>{project.updated}</small>
            </div>
          ))}
        </div>

        <div className="vibe-dashboard-upgrade">
          <h3>Go Pro Anytime</h3>
          <p>Unlock advanced features, team collaboration, and priority support.</p>
          <button type="button">Upgrade to Pro</button>
        </div>
      </aside>

      <div className="vibe-dashboard-main">
        <header className="vibe-dashboard-header"><div className="vibe-mode-pill">VIBE</div>
          <div>
            <h1>Vibe Mode</h1>
            <p>Chat. Design. Build. Launch. All in one flow.</p>
          </div>
          <div className="vibe-dashboard-device-switcher" role="tablist" aria-label="Device preview switcher">
            <button type="button" className="is-active">Desktop</button>
            <button type="button">Tablet</button>
            <button type="button">Mobile</button>
          </div>
          <div className="vibe-dashboard-cta-group">
            <button type="button" className="vibe-dashboard-share">Share</button>
            <button type="button" className="vibe-dashboard-launch" disabled={!firstRunState.canLaunch} aria-label={firstRunState.canLaunch ? "Launch app" : "Launch unavailable"}>{firstRunState.canLaunch ? "Launch App" : "Launch unavailable"}</button>
          </div>
        </header>

        <div className="vibe-dashboard-layout" data-testid="vibe-dashboard-layout">
          <main>
            <section className="vibe-chat-timeline" data-testid="vibe-chat-timeline">
              <div className="vibe-msg vibe-msg-user">Build me a modern booking website for a luxury hotel with a beautiful landing page.</div>
              <div className="vibe-msg vibe-msg-agent">
                I&apos;ve got you! I&apos;ll create a luxury hotel booking website with a stunning landing page.
                <div className="vibe-msg-pills">
                  <span>Understanding your idea</span>
                  <span>Designing the UI</span>
                  <span>Planning the features</span>
                  <span>Building it all together</span>
                </div>
              </div>

              <LiveUIBuilderCommandInput onSubmit={runCommandText} />

              {latestResult?.status === "needsResolution" ? (
                <LiveUIBuilderResolutionPanel
                  targets={resolverTargets.length > 0 ? resolverTargets : fallbackTargets}
                  isFallback={resolverTargets.length === 0}
                  onResolve={resolveTarget}
                />
              ) : null}

              {confirmationPending ? <LiveUIBuilderDiffPreview diff={preConfirmDiff?.diff} /> : null}

              <LiveUIBuilderPreviewSurface editableDocument={editableDocument} selectedNodeId={selectedNodeId} selectedPageId={selectedPageId} changedNodeIds={changedNodeIds} previewPatch={lastPreviewPatch} onSelectNode={selectNode} onDirectAction={runDirectManipulationAction} />

              <div className="vibe-suggestion-chips" aria-label="Suggestions">
                {suggestionChips.map((chip) => <button type="button" key={chip}>{chip}</button>)}
              </div>
            </section>

            <section className="vibe-input-shell" aria-label="Chat input" data-testid="vibe-input-shell">
              <form className="vibe-input-row" onSubmit={(event) => { event.preventDefault(); void orchestration.submitPrompt(); }}>
                <input value={orchestration.prompt} onChange={(event) => orchestration.setPrompt(event.target.value)} placeholder="Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)" aria-label="Vibe orchestration prompt" />
                <button type="submit" disabled={orchestration.submitting}>{orchestration.submitting ? "Submitting…" : "Send"}</button>
              </form>
              <div className="vibe-action-row">
                <button type="button" onClick={runSampleEdit}>Improve Design</button>
                <button type="button" onClick={runDestructiveEdit}>Apply destructive sample</button>
                <button type="button" onClick={confirmPending} disabled={!confirmationPending}>Confirm</button>
                <button type="button" onClick={rejectPending} disabled={!confirmationPending}>Reject</button>
                {actionChips.filter((chip) => chip !== "Improve Design").map((chip) => <button type="button" key={chip}>{chip}</button>)}
              </div>
            </section>
          </main>

          <aside className="vibe-right-rail" aria-label="Vibe intelligence rail" data-testid="vibe-right-rail">
            <section className="vibe-rail-card" aria-label="Build Map status">
              <header><h3>Build Map</h3></header>
              <VibeOrchestrationPanel graph={orchestration.graph} statusMessage={orchestration.statusMessage} executionRun={orchestration.executionRun} executionMessage={orchestration.executionMessage} />
            </section>

            <section className="vibe-rail-card" aria-label="Project state summary">
              <h3>Project State</h3>
              <div className="vibe-rail-row"><span>Objective</span><strong>{orchestration.graph.objective || "No objective saved"}</strong></div>
              <div className="vibe-rail-row"><span>Next step</span><strong>{orchestration.graph.nextStep || "No next step saved"}</strong></div>
              <div className="vibe-rail-row"><span>Resume</span><strong>{orchestration.runId || "No resumed run"}</strong></div>
              <div className="vibe-rail-row"><span>Execution</span><strong>{orchestration.executionMessage || "Execution status unavailable"}</strong></div>
              <small>{orchestration.resumeMessage || "No persisted state yet"}</small>
              {orchestration.resumeState === "unavailable" ? <small>Project state unavailable</small> : null}
            </section>

            <div className="vibe-rail-two-up">
              <VibeLivePreviewPanel runtimeStatus={runtimeState.status} previewUrl={runtimeState.previewUrl} />
              <section className="vibe-rail-card">
                <header><h3>App Health</h3></header>
                <div className="vibe-health">--<small>Health check not run</small></div>
              </section>
            </div>

            <section className="vibe-rail-card">
              <h3>What’s Next</h3>
              <p>{firstRunMessage || firstRunState.primaryAction?.label || "Describe your app idea"}</p>
              <small>{firstRunState.primaryAction?.detail || "No first-run state yet"}</small>
              <div className="vibe-next-grid">
                {firstRunState.steps.map((step) => (
                  <button type="button" key={step.id} disabled={step.disabled}>{step.label} · {step.status}</button>
                ))}
              </div>
            </section>


            <LiveUIBuilderAppStructurePanel appStructure={appStructure} needsResolution={appStructureNeedsResolution} candidates={appStructureCandidates} onSelectPage={selectPage} onDuplicatePage={duplicatePage} onRenamePage={renamePage} onAddToNav={updateNavigation} onExtractReusable={extractReusableComponent} onReuseComponent={reuseComponent} />

            {latestResult?.status === "applied" ? (<LiveUIBuilderSourceSyncPanel sourceSyncStatus={sourceSyncStatus} sourceSyncResult={sourceSyncResult} onDryRun={sourceSyncDryRun} onApply={() => sourceSyncApply(true)} canApply={hasRealFileAdapter && sourceSyncStatus === "dryRunReady"} hasRealFileAdapter={hasRealFileAdapter} />) : null}

            <section className="vibe-rail-card" aria-label="Latest interaction summary">
              <h3>Latest Summary</h3>
              <p>{userFacingSummary}</p>
              <pre>{JSON.stringify(latestReviewPayload ?? {}, null, 2)}</pre>
            </section>
            <section className="vibe-rail-card">
              <h3>Recent Activity</h3>
              <div className="vibe-rail-row"><span>No recent activity</span></div>
            </section>

            <section className="vibe-rail-card vibe-launch-card">
              <h3>One-Click Launch</h3>
              <p>{firstRunState.canLaunch ? "Launch prerequisites met" : "No launch proof yet"}</p>
              {!firstRunState.canLaunch ? <small>Launch proof missing</small> : null}
              <button type="button" disabled={!firstRunState.canLaunch}>{firstRunState.canLaunch ? "Launch" : "Launch unavailable"}</button>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
