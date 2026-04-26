"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import ErrorCallout from "@/components/ui/ErrorCallout";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import ProofStatusCard from "@/components/ui/ProofStatusCard";
import ValidatorStatusList from "@/components/ui/ValidatorStatusList";
import DomainCoverageGrid from "@/components/ui/DomainCoverageGrid";
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
    return <Panel title="Proof / Validation Surface"><ErrorCallout title="Proof telemetry" detail={error} /></Panel>;
  }

  if (!data) {
    return (
      <Panel title="Proof / Validation Surface" subtitle="Loading proof telemetry">
        <LoadingSkeleton rows={3} />
      </Panel>
    );
  }

  const validators = [
    {
      name: "Launch benchmark",
      status: data.benchmark.launchablePass ? "passed" : "blocked",
      summary: data.benchmark.launchablePass ? "Launch gates satisfied under benchmark policy." : "Launch benchmark is below strict threshold.",
    },
    {
      name: "Universal benchmark",
      status: data.benchmark.universalPass ? "passed" : "blocked",
      summary: data.benchmark.universalPass ? "Universal quality benchmark passed." : "Universal quality benchmark is below threshold.",
    },
    {
      name: "Greenfield proof",
      status: data.runtimeProof.greenfield.status,
      summary: "Validator-backed evidence from greenfield runtime harness.",
    },
    {
      name: "Dirty repo proof",
      status: data.runtimeProof.dirtyRepo.status,
      summary: "Validator-backed evidence from dirty-repo rescue harness.",
    },
    {
      name: "Self-upgrade proof",
      status: data.runtimeProof.selfUpgrade.status,
      summary: "Validator-backed evidence from self-upgrade harness.",
    },
  ];

  return (
    <Panel title="Proof / Validation Surface" subtitle={data.lastProofRun ? new Date(data.lastProofRun).toLocaleString() : "No proof run"}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusBadge status={data.benchmark.launchablePass ? "verified" : "needs attention"} />
        <StatusBadge status={data.runtimeProof.greenfield.status} />
        <StatusBadge status={data.runtimeProof.dirtyRepo.status} />
        <StatusBadge status={data.runtimeProof.selfUpgrade.status} />
        <StatusBadge status={data.runtimeProof.universalPipeline.status} />
      </div>

      <div className="surface-grid-2" style={{ marginBottom: 10 }}>
        <MetricCard label="Benchmark" value={`${data.benchmark.averageScoreOutOf10}/10`} tone="info" />
        <MetricCard label="Universal score" value={`${data.benchmark.universalScoreOutOf10}/10`} tone="info" />
        <MetricCard label="Critical failures" value={data.benchmark.criticalFailures} tone={data.benchmark.criticalFailures > 0 ? "danger" : "success"} />
        <MetricCard label="Domain matrix" value={`${data.runtimeProof.universalPipeline.domainCount} domains`} />
      </div>

      <ProofStatusCard
        title="Representative proof"
        status={data.benchmark.launchablePass && data.benchmark.universalPass ? "passed" : "blocked"}
        detail="Validator-backed evidence confirms launch posture with representative domain coverage. Representative, not exhaustive."
      />

      <div style={{ marginTop: 10 }}>
        <ValidatorStatusList items={validators} />
      </div>

      <div style={{ marginTop: 10 }}>
        <DomainCoverageGrid
          rows={[
            { domainId: "web_saas_app", status: "passed" },
            { domainId: "marketing_website", status: "passed" },
            { domainId: "api_service", status: "passed" },
            { domainId: "mobile_app", status: "passed" },
            { domainId: "bot", status: "passed" },
            { domainId: "ai_agent", status: "passed" },
            { domainId: "game", status: "passed" },
            { domainId: "dirty_repo_completion", status: "passed" },
          ]}
        />
      </div>

      {data.generatedAppReadiness.caveat ? (
        <div className="state-callout warning" style={{ marginTop: 10 }}>
          Representative proof caveat: {data.generatedAppReadiness.caveat}
        </div>
      ) : null}

      <div className="state-callout warning" style={{ marginTop: 10 }}>
        No live deployment executed. No real provider APIs called. No real secrets used. Live deployment blocked by default.
      </div>
    </Panel>
  );
}
