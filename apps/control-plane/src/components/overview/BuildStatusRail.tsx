"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { getProofStatus } from "@/services/proof";
import { getProjectGate } from "@/services/gate";
import { getSpecStatus } from "@/services/spec";
import { getProjectOverview } from "@/services/overview";
import { getAutonomousBuildStatus } from "@/services/autonomousBuild";
import { ACTION_RAIL_COMMANDS, type ActionRailCommandKey } from "@/components/chat/actionRailCommands";
import { buildPartnerEnvelope, executeCanonicalCommand, fetchRuntimeContext } from "@/components/chat/chatCommandExecutor";

type BuildStatusRailProps = {
  projectId: string;
};

export default function BuildStatusRail({ projectId }: BuildStatusRailProps) {
  const [overview, setOverview] = useState<any>(null);
  const [gate, setGate] = useState<any>(null);
  const [proof, setProof] = useState<any>(null);
  const [specStatus, setSpecStatus] = useState<any>(null);
  const [autonomous, setAutonomous] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>("");

  async function load() {
    try {
      const [nextOverview, nextGate, nextProof, nextSpec] = await Promise.all([
        getProjectOverview(projectId),
        getProjectGate(projectId),
        getProofStatus(projectId),
        getSpecStatus(projectId),
      ]);

      let nextAutonomous: any = null;
      try {
        nextAutonomous = await getAutonomousBuildStatus(projectId);
      } catch {
        nextAutonomous = null;
      }

      setOverview(nextOverview);
      setGate(nextGate);
      setProof(nextProof);
      setSpecStatus(nextSpec);
      setAutonomous(nextAutonomous);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(timer);
  }, [projectId]);

  const blockers = useMemo<string[]>(() => {
    const next = new Set<string>();
    for (const blocker of overview?.blockers || []) next.add(String(blocker));
    for (const blocker of specStatus?.blockers || []) next.add(String(blocker));
    for (const blocker of autonomous?.run?.humanBlockers || []) next.add(String(blocker?.detail || blocker?.code || ""));
    return Array.from(next).filter(Boolean).slice(0, 4);
  }, [autonomous?.run?.humanBlockers, overview?.blockers, specStatus?.blockers]);

  const run = autonomous?.run;
  const failure = run?.checkpoint?.lastFailure || null;
  const signatureAttempts = failure ? run?.checkpoint?.repairAttemptsBySignature?.[failure.failureSignature] || failure.attemptsBySignature : 0;
  const repairBudgetExhausted = Boolean(failure?.repairBudgetExhausted);
  const needsHumanDecision = Boolean(failure?.escalationRequired || failure?.userQuestion);
  const latestArtifact = run?.checkpoint?.artifactPaths?.slice(-1)?.[0] || "None";

  async function executeAction(key: ActionRailCommandKey) {
    const command = ACTION_RAIL_COMMANDS[key];
    setBusy(key);
    setError(null);
    try {
      const runtime = await fetchRuntimeContext(projectId);
      const execution = await executeCanonicalCommand({
        projectId,
        input: command,
        runtimeContext: runtime,
      });
      setLastAction(buildPartnerEnvelope(runtime, execution.commandRun, execution.details));
      await load();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(null);
    }
  }

  function actionTriplet(base: string) {
    const runKey: ActionRailCommandKey =
      base === "continue"
        ? "continue_build"
        : base === "failure"
        ? "inspect_failure"
        : base === "blocker"
        ? "resolve_blocker"
        : base === "validation"
        ? "validate"
        : base === "proof"
        ? "show_proof"
        : base === "keys"
        ? "configure_keys"
        : base === "deployment"
        ? "prepare_deployment"
        : base === "contract"
        ? "approve_contract"
        : "generate_plan";

    const explainKey: ActionRailCommandKey = base === "proof" ? "show_proof" : base === "keys" ? "configure_keys" : "generate_plan";
    const resolveKey: ActionRailCommandKey =
      base === "blocker"
        ? "resolve_blocker"
        : base === "validation"
        ? "validate"
        : base === "deployment"
        ? "prepare_deployment"
        : base === "contract"
        ? "approve_contract"
        : "continue_build";

    return (
      <div className="rail-card-actions" aria-label={`${base} actions`}>
        <button disabled={Boolean(busy)} onClick={() => void executeAction(runKey)}>Run</button>
        <button disabled={Boolean(busy)} onClick={() => void executeAction(explainKey)}>Explain</button>
        <button disabled={Boolean(busy)} onClick={() => void executeAction(resolveKey)}>Resolve</button>
      </div>
    );
  }

  return (
    <aside className="status-rail" aria-label="Build action rail">
      <div className="rail-section">
        <div className="rail-title">Build action rail</div>
        <div className="rail-badges">
          <StatusBadge status={overview?.latestRun?.status || "idle"} />
          <StatusBadge status={gate?.launchStatus || "pending"} />
          <StatusBadge status={proof?.benchmark?.launchablePass ? "verified" : "needs attention"} />
        </div>
      </div>

      <div className="rail-card-grid">
        <div className="rail-card">
          <div className="rail-label">Run</div>
          <div className="rail-value">{run ? "active" : "idle"}</div>
          <div className="rail-muted">{run?.runId || "No run started"}</div>
          {actionTriplet("continue")}
        </div>
        <div className="rail-card">
          <div className="rail-label">Current milestone</div>
          <div className="rail-value">{run?.checkpoint?.currentMilestone || "Not started"}</div>
          <div className="rail-muted">Completed: {run?.checkpoint?.completedMilestones?.length || 0}</div>
          <div className="rail-muted">Failure category: {failure?.failureCategory || "none"}</div>
          <div className="rail-muted">Recommended strategy: {failure?.recommendedStrategyId || failure?.recommendedStrategyName || "none"}</div>
          <div className="rail-muted">Why this strategy: {failure?.whyThisStrategy || "n/a"}</div>
          <div className="rail-muted">Rejected strategies: {(failure?.rejectedStrategies || []).map((item: any) => `${item.strategyId}(${item.reason})`).join(", ") || "none"}</div>
          <div className="rail-muted">Prior similar outcomes: {(failure?.priorSimilarOutcomes || []).map((item: any) => `${item.strategyId}:${item.outcome}`).join(", ") || "none"}</div>
          <div className="rail-muted">Repair attempts by signature: {signatureAttempts}</div>
          <div className="rail-muted">Recommended next action: {failure?.repairBudgetExhausted?.exactNextAction || failure?.recommendedRepair || run?.checkpoint?.nextAction || "continue build"}</div>
          <div className="rail-muted">Validation after repair: {failure?.expectedValidationCommand || failure?.validationCommandAfterRepair || "n/a"}</div>
          <div className="rail-muted">Rollback plan: {failure?.rollbackPlan || "Revert touched files"}</div>
          <div className="rail-muted">Human decision required: {needsHumanDecision ? "yes" : "no"}</div>
          {actionTriplet("failure")}
        </div>
        <div className="rail-card">
          <div className="rail-label">Validation</div>
          <div className="rail-value">{proof?.benchmark?.launchablePass ? "pass" : "not run / fail"}</div>
          <div className="rail-muted">Critical failures: {proof?.benchmark?.criticalFailures ?? 0}</div>
          {actionTriplet("validation")}
        </div>
        <div className="rail-card">
          <div className="rail-label">Launch</div>
          <div className="rail-value">{gate?.launchStatus || "blocked"}</div>
          <div className="rail-muted">Approval: {gate?.approvalStatus || "pending"}</div>
          {actionTriplet("deployment")}
        </div>
        <div className="rail-card">
          <div className="rail-label">Artifacts</div>
          <div className="rail-value">{run?.checkpoint?.artifactPaths?.length || 0}</div>
          <div className="rail-muted" title={latestArtifact}>{latestArtifact}</div>
          {actionTriplet("proof")}
        </div>
        <div className="rail-card">
          <div className="rail-label">Next action</div>
          <div className="rail-value rail-value--small">{run?.checkpoint?.nextAction || "Start build from chat"}</div>
          {actionTriplet("contract")}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Shortcut controls (optional)</div>
        <div className="rail-controls">
          {repairBudgetExhausted ? (
            <>
              <button disabled={Boolean(busy)} onClick={() => void executeAction("inspect_failure")}>{busy === "inspect_failure" ? "Working..." : "Inspect failure"}</button>
              <button disabled={Boolean(busy)} onClick={() => void executeAction("continue_build")}>{busy === "continue_build" ? "Working..." : "Continue build"}</button>
            </>
          ) : (
            <>
              <button disabled={Boolean(busy)} onClick={() => void executeAction("continue_build")}>{busy === "continue_build" ? "Working..." : "Continue build"}</button>
              <button disabled={Boolean(busy)} onClick={() => void executeAction("inspect_failure")}>{busy === "inspect_failure" ? "Working..." : "Inspect failure"}</button>
            </>
          )}
          <button disabled={Boolean(busy)} onClick={() => void executeAction("resolve_blocker")}>{busy === "resolve_blocker" ? "Working..." : "Resolve blocker"}</button>
          <button disabled={Boolean(busy)} onClick={() => void executeAction("validate")}>{busy === "validate" ? "Working..." : "Validate"}</button>
          <button disabled={Boolean(busy)} onClick={() => void executeAction("configure_keys")}>{busy === "configure_keys" ? "Working..." : "Configure keys"}</button>
          <button disabled={Boolean(busy)} onClick={() => void executeAction("prepare_deployment")}>{busy === "prepare_deployment" ? "Working..." : "Prepare deployment"}</button>
          <button disabled={Boolean(busy)} onClick={() => void executeAction("approve_contract")}>{busy === "approve_contract" ? "Working..." : "Approve contract"}</button>
          <button disabled={Boolean(busy)} onClick={() => void executeAction("generate_plan")}>{busy === "generate_plan" ? "Working..." : "Generate plan"}</button>
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-title">Blockers</div>
        {blockers.length === 0 ? (
          <div className="rail-muted">No blockers reported.</div>
        ) : (
          <ul className="rail-list">
            {blockers.map((blocker) => (
              <li key={blocker}>
                <span>{blocker}</span>
                <div className="rail-inline-actions">
                  <button disabled={Boolean(busy)} onClick={() => void executeAction("resolve_blocker")}>Resolve</button>
                  <button disabled={Boolean(busy)} onClick={() => void executeAction("inspect_failure")}>Explain</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/projects/${projectId}/validators`} className="rail-link">View blocker details</Link>
      </div>

      <div className="rail-section">
        <div className="rail-title">Details</div>
        <div className="rail-links">
          <Link href={`/projects/${projectId}/deployment`} className="rail-link">Deployment readiness</Link>
          <Link href={`/projects/${projectId}/validators`} className="rail-link">Validators</Link>
          <Link href={`/projects/${projectId}/logs`} className="rail-link">Logs and timeline</Link>
          <Link href={`/projects/${projectId}/evidence`} className="rail-link">Latest artifact</Link>
        </div>
      </div>

      {error ? <div className="state-callout error">{error}</div> : null}
      {lastAction ? <div className="state-callout" style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{lastAction}</div> : null}
    </aside>
  );
}
