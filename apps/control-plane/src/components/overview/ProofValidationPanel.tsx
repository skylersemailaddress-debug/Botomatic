"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { getProofStatus } from "@/services/proof";

export default function ProofValidationPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = await getProofStatus(projectId);
        if (!active) return;
        setData(next);
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

  if (error) {
    return <Panel title="Proof / Validation Surface"><div className="state-callout error">{error}</div></Panel>;
  }

  if (!data) {
    return (
      <Panel title="Proof / Validation Surface" subtitle="Loading proof telemetry">
        <div className="skeleton" />
      </Panel>
    );
  }

  return (
    <Panel title="Proof / Validation Surface" subtitle={data.lastProofRun ? new Date(data.lastProofRun).toLocaleString() : "No proof run"}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusBadge status={data.benchmark.launchablePass ? "verified" : "needs attention"} />
        <StatusBadge status={data.runtimeProof.greenfield.status} />
        <StatusBadge status={data.runtimeProof.dirtyRepo.status} />
        <StatusBadge status={data.runtimeProof.selfUpgrade.status} />
        <StatusBadge status={data.runtimeProof.universalPipeline.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div className="metric-card">
          <div className="metric-label">Benchmark</div>
          <div className="metric-value">{data.benchmark.averageScoreOutOf10}/10</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Universal Score</div>
          <div className="metric-value">{data.benchmark.universalScoreOutOf10}/10</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Critical Failures</div>
          <div className="metric-value">{data.benchmark.criticalFailures}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Domain Matrix</div>
          <div className="metric-value">{data.runtimeProof.universalPipeline.domainCount} domains</div>
        </div>
      </div>

      {data.generatedAppReadiness.caveat ? (
        <div className="state-callout warning" style={{ marginTop: 10 }}>
          Generated-output caveat: {data.generatedAppReadiness.caveat}
        </div>
      ) : null}
    </Panel>
  );
}
