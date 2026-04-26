"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
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

  return (
    <div style={{ padding: 18, borderBottom: "1px solid var(--border)", background: "var(--panel-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Botomatic Control Plane
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 3 }}>{projectId}</div>
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
        <div className="metric-card">
          <div className="metric-label">Current Phase</div>
          <div className="metric-value">{currentPhase}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Readiness Score</div>
          <div className="metric-value">{readinessScore}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Validator Status</div>
          <div className="metric-value">{validatorStatus}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Launch Gate</div>
          <div className="metric-value">{gate?.launchStatus || "pending"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Benchmark</div>
          <div className="metric-value">{proof?.benchmark?.averageScoreOutOf10 ?? "n/a"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Universal Score</div>
          <div className="metric-value">{proof?.benchmark?.universalScoreOutOf10 ?? "n/a"}</div>
        </div>
      </div>
    </div>
  );
}
