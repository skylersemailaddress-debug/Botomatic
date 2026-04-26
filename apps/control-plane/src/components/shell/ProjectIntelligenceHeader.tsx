"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import LaunchGateBanner from "@/components/ui/LaunchGateBanner";
import { getProjectOverview } from "@/services/overview";
import { getProjectGate } from "@/services/gate";
import { getProofStatus } from "@/services/proof";

type HeaderProps = {
  projectId: string;
  environment: string;
};

export default function ProjectIntelligenceHeader({ projectId, environment }: HeaderProps) {
  const [overview, setOverview] = useState<any>(null);
  const [gate, setGate] = useState<any>(null);
  const [proof, setProof] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextOverview, nextGate, nextProof] = await Promise.all([
          getProjectOverview(projectId),
          getProjectGate(projectId),
          getProofStatus(projectId),
        ]);
        if (!active) return;
        setOverview(nextOverview);
        setGate(nextGate);
        setProof(nextProof);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(String(err?.message || err));
      }
    }

    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [projectId]);

  const readinessScore = overview?.readiness?.score ?? "n/a";
  const currentPhase = overview?.latestRun?.currentStage || overview?.latestRun?.status || "idle";
  const validatorStatus = proof?.benchmark?.launchablePass ? "verified" : "needs attention";
  const proofRun = proof?.lastProofRun ? new Date(proof.lastProofRun).toLocaleString() : "Not captured";
  const launchReady = gate?.launchStatus === "ready" && proof?.benchmark?.launchablePass && proof?.benchmark?.universalPass;
  const noLiveExecution = proof?.generatedAppReadiness?.caveat ? "No live deployment executed" : "No live deployment executed";

  return (
    <header style={{ padding: 20, borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Botomatic Control Plane
          </div>
          <h1 style={{ fontSize: "var(--font-size-title)", fontWeight: "var(--font-weight-heavy)", margin: "4px 0 0" }}>{projectId}</h1>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={currentPhase} />
            <StatusBadge status={gate?.launchStatus || "pending"} />
            <StatusBadge status={gate?.approvalStatus || "pending"} />
            <StatusBadge status={validatorStatus} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
          <div>Environment: {environment}</div>
          <div>Last proof run: {proofRun}</div>
          {error ? <div style={{ color: "var(--danger)", marginTop: 4 }}>Proof telemetry unavailable</div> : null}
        </div>
      </div>

      <div className="metric-grid" style={{ marginTop: 14 }}>
        <MetricCard label="Current Phase" value={currentPhase} />
        <MetricCard label="Readiness Score" value={readinessScore} tone={launchReady ? "success" : "warning"} />
        <MetricCard label="Validator Status" value={validatorStatus} tone={proof?.benchmark?.launchablePass ? "success" : "warning"} />
        <MetricCard label="Launch Gate" value={gate?.launchStatus || "pending"} tone={launchReady ? "success" : "warning"} />
        <MetricCard label="Benchmark" value={`${proof?.benchmark?.averageScoreOutOf10 ?? "n/a"}/10`} />
        <MetricCard label="Universal Score" value={`${proof?.benchmark?.universalScoreOutOf10 ?? "n/a"}/10`} />
      </div>

      <div style={{ marginTop: 14 }}>
        <LaunchGateBanner
          launchReady={Boolean(launchReady)}
          caveat={`${noLiveExecution}. No real provider APIs called. No real secrets used. Representative, not exhaustive.`}
        />
      </div>
    </header>
  );
}
