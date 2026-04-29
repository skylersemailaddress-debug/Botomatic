"use client";

import Link from "next/link";

import { actionChips, buildMapItems, recentActivity, recentProjects, suggestionChips, vibeSidebarNav } from "./vibeSeedData";
import { LiveUIBuilderCommandInput } from "../live-ui-builder/LiveUIBuilderCommandInput";
import { LiveUIBuilderDiffPreview } from "../live-ui-builder/LiveUIBuilderDiffPreview";
import { LiveUIBuilderResolutionPanel, type ResolutionTarget } from "../live-ui-builder/LiveUIBuilderResolutionPanel";
import { LiveUIBuilderPreviewSurface } from "./LiveUIBuilderPreviewSurface";
import { LiveUIBuilderSourceSyncPanel } from "../live-ui-builder/LiveUIBuilderSourceSyncPanel";
import { LiveUIBuilderAppStructurePanel } from "../live-ui-builder/LiveUIBuilderAppStructurePanel";
import { useLiveUIBuilderVibe } from "./useLiveUIBuilderVibe";

export function VibeDashboard({ projectId }: { projectId: string }) {
  const { latestResult, userFacingSummary, latestReviewPayload, confirmationPending, runSampleEdit, runDestructiveEdit, runCommandText, retryLastCommand, resolveTarget, pendingResolution, confirmPending, rejectPending, editableDocument, selectedNodeId, selectedPageId, changedNodeIds, lastPreviewPatch, selectNode, runDirectManipulationAction, preConfirmDiff, sourceSyncDryRun, sourceSyncApply, sourceSyncResult, sourceSyncStatus, hasRealFileAdapter, appStructure, appStructureNeedsResolution, appStructureCandidates, selectPage, duplicatePage, renamePage, updateNavigation, extractReusableComponent, reuseComponent } = useLiveUIBuilderVibe();
  const fallbackTargets: ResolutionTarget[] = Object.values(editableDocument.pages?.[0]?.nodes ?? {}).slice(0, 8).map((node: any) => ({ nodeId: node.id, label: node.identity?.semanticLabel ?? node.id, type: node.kind ?? "node", page: editableDocument.pages?.[0]?.id ?? "page", location: node.parentId ? `child of ${node.parentId}` : "root" }));
  const resolverTargets: ResolutionTarget[] = (pendingResolution?.candidates ?? []).map((nodeId: string) => ({ nodeId, label: nodeId, type: "resolver candidate", page: editableDocument.pages.find((page: any) => page.nodes[nodeId])?.id ?? "unknown", location: "resolver" }));
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

        <button type="button" className="vibe-dashboard-new-project">+ New Project</button>

        <nav className="vibe-dashboard-nav" aria-label="Dashboard navigation">
          {vibeSidebarNav.map((item) => <button type="button" key={item} className={item === "Home" ? "is-active" : ""}>{item}</button>)}
        </nav>

        <div className="vibe-dashboard-card">
          <h3>Recent Projects</h3>
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
        <header className="vibe-dashboard-header">
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
            <button type="button" className="vibe-dashboard-launch">Launch App</button>
          </div>
        </header>

        <div className="vibe-dashboard-layout">
          <main>
            <section className="vibe-chat-timeline">
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

            <section className="vibe-input-shell" aria-label="Chat input">
              <div className="vibe-input-row">
                <span>Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)</span>
                <button type="button">Send</button>
              </div>
              <div className="vibe-action-row">
                <button type="button" onClick={runSampleEdit}>Improve Design</button>
                <button type="button" onClick={runDestructiveEdit}>Apply destructive sample</button>
                <button type="button" onClick={confirmPending} disabled={!confirmationPending}>Confirm</button>
                <button type="button" onClick={rejectPending} disabled={!confirmationPending}>Reject</button>
                {actionChips.filter((chip) => chip !== "Improve Design").map((chip) => <button type="button" key={chip}>{chip}</button>)}
              </div>
            </section>
          </main>

          <aside className="vibe-right-rail" aria-label="Vibe intelligence rail">
            <section className="vibe-rail-card">
              <header><h3>Build Map</h3><button type="button" className="vibe-link-button">View Audit</button></header>
              <div className="vibe-step-line"><span className="is-done">Design</span><span className="is-active">Features</span><span>Data</span><span>Testing</span><span>Launch</span></div>
              {buildMapItems.map((item) => (
                <div className="vibe-rail-row" key={item.task}><span>{item.task}</span><strong>{item.status}</strong></div>
              ))}
            </section>

            <div className="vibe-rail-two-up">
              <section className="vibe-rail-card">
                <header><h3>Live Preview</h3><strong>Live</strong></header>
                <div className="vibe-mini-preview">Luxury hotel page preview</div>
              </section>
              <section className="vibe-rail-card">
                <header><h3>App Health</h3></header>
                <div className="vibe-health">92%<small>Excellent</small></div>
              </section>
            </div>

            <section className="vibe-rail-card">
              <h3>What’s Next</h3>
              <div className="vibe-next-grid">
                <button type="button">Connect Domain</button>
                <button type="button">Add Logo</button>
                <button type="button">Payment Setup</button>
                <button type="button">Email Notifications</button>
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
              {recentActivity.map((event) => (
                <div key={event.item} className="vibe-rail-row"><span>{event.item}</span><small>{event.time}</small></div>
              ))}
            </section>

            <section className="vibe-rail-card vibe-launch-card">
              <h3>One-Click Launch</h3>
              <p>Everything looks good! Your app is ready to launch locally.</p>
              <button type="button">Launch My App</button>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
