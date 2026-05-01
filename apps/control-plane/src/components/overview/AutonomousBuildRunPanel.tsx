"use client";

import { useEffect, useMemo, useState } from "react";
import Panel from "@/components/ui/Panel";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorCallout from "@/components/ui/ErrorCallout";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  approveAutonomousBuildBlocker,
  getAutonomousBuildStatus,
  resumeAutonomousBuild,
  startAutonomousBuild,
  type AutonomousBuildRunResponse,
} from "@/services/autonomousBuild";

export default function AutonomousBuildRunPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<AutonomousBuildRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("Build this entire spec and continue autonomously with safe defaults.");

  async function load() {
    try {
      const next = await getAutonomousBuildStatus(projectId);
      setData(next);
      setError(null);
    } catch (e: any) {
      const message = String(e?.message || "");
      if (message.includes("404")) {
        setData(null);
        setError(null);
        return;
      }
      setError(message || "Autonomous build status unavailable.");
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(timer);
  }, [projectId]);

  const run = data?.run || null;
  const completed = useMemo(() => new Set(run?.checkpoint.completedMilestones || []), [run]);

  async function onStart() {
    setBusy(true);
    try {
      const next = await startAutonomousBuild(projectId, draft);
      setData(next);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Unable to start autonomous build.");
    } finally {
      setBusy(false);
    }
  }

  async function onResume() {
    setBusy(true);
    try {
      const pendingCodes = (run?.humanBlockers || []).filter((b) => b.approved).map((b) => b.code);
      const next = await resumeAutonomousBuild(projectId, pendingCodes);
      setData(next);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Unable to resume autonomous build.");
    } finally {
      setBusy(false);
    }
  }

  async function onApproveBlocker(code: string) {
    setBusy(true);
    try {
      const next = await approveAutonomousBuildBlocker(projectId, code);
      setData(next);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Unable to approve blocker.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Autonomous Complex Build"
      subtitle="Milestone-gated execution with checkpoint/resume and high-risk escalation"
      footer={
        <div className="state-callout warning">
          Autonomous mode continues low/medium-risk work. It pauses only for secrets, live-deployment approval, paid actions, legal/compliance decisions, destructive rewrites, irreversible operations, or unresolved high-risk contradictions.
        </div>
      }
    >
      {error ? <ErrorCallout title="Autonomous build error" detail={error} /> : null}

      <div className="row" style={{ marginBottom: 10 }}>
        {run ? <StatusBadge status={run.status} /> : <StatusBadge status="idle" />}
        <button onClick={onStart} disabled={busy}>{busy ? "Working..." : "Build from uploaded complex spec"}</button>
        <button onClick={onResume} disabled={busy || !run || run.status === "completed"}>{busy ? "Working..." : "Continue the build"}</button>
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        Run intent
        <textarea className="composer-textarea" style={{}} value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>

      {!run ? (
        <EmptyState title="No autonomous run yet" detail="Start a run to generate milestone graph, checkpoints, and autonomous execution state." />
      ) : (
        <>
          <div className="surface-grid-2" style={{ marginBottom: 10 }}>
            <div className="proof-status-card">
              <div className="proof-status-title">Checkpoint and resume</div>
              <div className="proof-status-detail">Run ID: {run.runId}</div>
              <div className="proof-status-detail">Current milestone: {run.checkpoint.currentMilestone}</div>
              <div className="proof-status-detail">Completed milestones: {run.checkpoint.completedMilestones.length}</div>
              <div className="proof-status-detail">Repair attempts: {run.checkpoint.repairAttempts}</div>
              <div className="proof-status-detail">Failure category: {run.checkpoint.lastFailure?.failureCategory || "none"}</div>
              <div className="proof-status-detail">Recommended strategy: {run.checkpoint.lastFailure?.recommendedStrategyId || run.checkpoint.lastFailure?.recommendedStrategyName || "none"}</div>
              <div className="proof-status-detail">Why this strategy: {run.checkpoint.lastFailure?.whyThisStrategy || "n/a"}</div>
              <div className="proof-status-detail">Rejected strategies: {(run.checkpoint.lastFailure?.rejectedStrategies || []).map((item) => `${item.strategyId}(${item.reason})`).join(", ") || "none"}</div>
              <div className="proof-status-detail">Prior similar outcomes: {(run.checkpoint.lastFailure?.priorSimilarOutcomes || []).map((item) => `${item.strategyId}:${item.outcome}`).join(", ") || "none"}</div>
              <div className="proof-status-detail">Signature attempts: {run.checkpoint.lastFailure ? run.checkpoint.repairAttemptsBySignature?.[run.checkpoint.lastFailure.failureSignature] || run.checkpoint.lastFailure.attemptsBySignature : 0}</div>
              <div className="proof-status-detail">Human decision required: {run.checkpoint.lastFailure?.escalationRequired ? "yes" : "no"}</div>
              <div className="proof-status-detail">Resume command: {run.checkpoint.resumeCommand}</div>
            </div>
            <div className="proof-status-card">
              <div className="proof-status-title">Final release assembly</div>
              <div className="proof-status-detail">Assembled: {run.finalReleaseAssembled ? "yes" : "not yet"}</div>
              <div className="proof-status-detail">Next action: {run.checkpoint.nextAction}</div>
              <div className="proof-status-detail">Recommended repair: {run.checkpoint.lastFailure?.recommendedRepair || "none"}</div>
              <div className="proof-status-detail">Validation after repair: {run.checkpoint.lastFailure?.expectedValidationCommand || run.checkpoint.lastFailure?.validationCommandAfterRepair || "n/a"}</div>
              <div className="proof-status-detail">Rollback plan: {run.checkpoint.lastFailure?.rollbackPlan || "Revert touched files"}</div>
              <div className="proof-status-detail">Artifacts tracked: {run.checkpoint.artifactPaths.length}</div>
            </div>
          </div>

          <div className="proof-status-card" style={{ marginBottom: 10 }}>
            <div className="proof-status-title">Milestone graph</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {run.milestoneGraph.map((milestone) => (
                <div key={milestone.id} className="validator-row">
                  <div>
                    <div className="validator-name">{milestone.id}</div>
                    <div className="validator-summary">{milestone.objective}</div>
                    <div className="validator-summary">Dependencies: {milestone.dependencies.join(", ") || "none"}</div>
                    <div className="validator-summary">Policy: {milestone.blockerPolicy}</div>
                  </div>
                  <StatusBadge status={completed.has(milestone.id) ? "passed" : run.checkpoint.currentMilestone === milestone.id ? "running" : "pending"} />
                </div>
              ))}
            </div>
          </div>

          <div className="proof-status-card" style={{ marginBottom: 10 }}>
            <div className="proof-status-title">Human blockers</div>
            {(run.humanBlockers || []).length === 0 ? (
              <EmptyState title="No blocker currently requires human input" detail="Low and medium risk tasks continue autonomously." />
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {run.humanBlockers.map((blocker) => (
                  <div key={blocker.code} className="validator-row">
                    <div>
                      <div className="validator-name">{blocker.code}</div>
                      <div className="validator-summary">{blocker.detail}</div>
                    </div>
                    {blocker.approved ? (
                      <StatusBadge status="approved" />
                    ) : (
                      <button disabled={busy} onClick={() => onApproveBlocker(blocker.code)}>Approve blocker</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="proof-status-card">
            <div className="proof-status-title">Recent run logs</div>
            {run.checkpoint.logs.length === 0 ? (
              <LoadingSkeleton rows={2} />
            ) : (
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {run.checkpoint.logs.slice(-8).reverse().map((line, idx) => (
                  <li key={`${idx}-${line}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
