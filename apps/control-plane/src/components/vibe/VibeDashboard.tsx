"use client";

import ProjectWorkspaceShell from "../project/ProjectWorkspaceShell";
import { useCallback, useEffect, useState } from "react";

import { actionChips, suggestionChips } from "./vibeSeedData";
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
import { requestDeploy } from "@/services/launchProof";

export function VibeDashboard({ projectId }: { projectId: string }) {
  const { latestResult, userFacingSummary, latestReviewPayload, confirmationPending, runSampleEdit, runCommandText, resolveTarget, pendingResolution, confirmPending, rejectPending, editableDocument, selectedNodeId, selectedPageId, changedNodeIds, lastPreviewPatch, selectNode, runDirectManipulationAction, preConfirmDiff, sourceSyncDryRun, sourceSyncApply, sourceSyncResult, sourceSyncStatus, hasRealFileAdapter, appStructure, appStructureNeedsResolution, appStructureCandidates, selectPage, duplicatePage, renamePage, updateNavigation, extractReusableComponent, reuseComponent, addPage } = useLiveUIBuilderVibe();
  const fallbackTargets: ResolutionTarget[] = Object.values(editableDocument.pages?.[0]?.nodes ?? {}).slice(0, 8).map((node: any) => ({ nodeId: node.id, label: node.identity?.semanticLabel ?? node.id, type: node.kind ?? "node", page: editableDocument.pages?.[0]?.id ?? "page", location: node.parentId ? `child of ${node.parentId}` : "root" }));
  const resolverTargets: ResolutionTarget[] = (pendingResolution?.candidates ?? []).map((nodeId: string) => ({ nodeId, label: nodeId, type: "resolver candidate", page: editableDocument.pages.find((page: any) => page.nodes[nodeId])?.id ?? "unknown", location: "resolver" }));
  const [runtimeState, setRuntimeState] = useState<{ status?: string; previewUrl?: string }>({});
  const [firstRunState, setFirstRunState] = useState<FirstRunState>(getFirstRunFallback(projectId));
  const [firstRunMessage, setFirstRunMessage] = useState<string>("No first-run state yet");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
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

  const handleShare = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href).catch(() => undefined);
  }, []);

  const handleLaunch = useCallback(async () => {
    await requestDeploy(projectId, { idempotencyKey: `launch_${Date.now()}` });
  }, [projectId]);

  const handleSuggestionChip = useCallback((chip: string) => {
    orchestration.setPrompt(chip);
    void orchestration.submitPrompt();
  }, [orchestration]);

  const handleActionChip = useCallback((chip: string) => {
    if (chip === "Add Page") { addPage("New Page"); return; }
    if (chip === "Launch App") {
      if (firstRunState.canLaunch) { void handleLaunch(); return; }
      orchestration.setPrompt("Launch the app");
      void orchestration.submitPrompt();
      return;
    }
    const promptMap: Record<string, string> = {
      "Add Feature": "Add a new feature to the app",
      "Connect Payments": "Connect payments with Stripe",
      "Run Tests": "Run the test suite",
    };
    const prompt = promptMap[chip] ?? chip;
    orchestration.setPrompt(prompt);
    void orchestration.submitPrompt();
  }, [addPage, firstRunState.canLaunch, handleLaunch, orchestration]);
  return (
    <ProjectWorkspaceShell projectId={projectId} mode="vibe">

      <div className="vibe-dashboard-main">
        <header className="vibe-dashboard-header"><div className="vibe-mode-pill">VIBE</div>
          <div>
            <h1>Vibe Mode</h1>
            <p>Chat. Design. Build. Launch. All in one flow.</p>
          </div>
          <div className="vibe-dashboard-device-switcher" role="tablist" aria-label="Device preview switcher">
            <button type="button" className={deviceMode === "desktop" ? "is-active" : ""} onClick={() => setDeviceMode("desktop")}>Desktop</button>
            <button type="button" className={deviceMode === "tablet" ? "is-active" : ""} onClick={() => setDeviceMode("tablet")}>Tablet</button>
            <button type="button" className={deviceMode === "mobile" ? "is-active" : ""} onClick={() => setDeviceMode("mobile")}>Mobile</button>
          </div>
          <div className="vibe-dashboard-cta-group">
            <button type="button" className="vibe-dashboard-share" onClick={handleShare}>Share</button>
            <button type="button" className="vibe-dashboard-launch" disabled={!firstRunState.canLaunch} aria-label={firstRunState.canLaunch ? "Launch app" : "Launch unavailable"} onClick={() => { if (firstRunState.canLaunch) void handleLaunch(); }}>{firstRunState.canLaunch ? "Launch App" : "Launch unavailable"}</button>
          </div>
        </header>

        <div className="vibe-dashboard-layout" data-testid="vibe-dashboard-layout">
          <main>
            <section className="vibe-chat-timeline" data-testid="vibe-chat-timeline">
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
                {suggestionChips.map((chip) => <button type="button" key={chip} onClick={() => handleSuggestionChip(chip)}>{chip}</button>)}
              </div>
            </section>

            <section className="vibe-input-shell" aria-label="Chat input" data-testid="vibe-input-shell">
              <form className="vibe-input-row" onSubmit={(event) => { event.preventDefault(); void orchestration.submitPrompt(); }}>
                <input value={orchestration.prompt} onChange={(event) => orchestration.setPrompt(event.target.value)} placeholder="Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)" aria-label="Vibe orchestration prompt" />
                <button type="submit" disabled={orchestration.submitting}>{orchestration.submitting ? "Submitting…" : "Send"}</button>
              </form>
              <div className="vibe-action-row">
                <button type="button" onClick={runSampleEdit}>Improve Design</button>
                <button type="button" onClick={confirmPending} disabled={!confirmationPending}>Confirm</button>
                <button type="button" onClick={rejectPending} disabled={!confirmationPending}>Reject</button>
                {actionChips.filter((chip) => chip !== "Improve Design").map((chip) => <button type="button" key={chip} onClick={() => handleActionChip(chip)}>{chip}</button>)}
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
              <h3>What's Next</h3>
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
              <button type="button" disabled={!firstRunState.canLaunch} onClick={() => { if (firstRunState.canLaunch) void handleLaunch(); }}>{firstRunState.canLaunch ? "Launch" : "Launch unavailable"}</button>
            </section>
          </aside>
        </div>
      </div>
    </ProjectWorkspaceShell>
  );
}
