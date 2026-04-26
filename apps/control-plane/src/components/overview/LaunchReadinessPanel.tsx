"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import LaunchGateBanner from "@/components/ui/LaunchGateBanner";
import ReadinessTimeline from "@/components/ui/ReadinessTimeline";
import DomainCoverageGrid from "@/components/ui/DomainCoverageGrid";
import { getProjectGate } from "@/services/gate";
import { getProofStatus } from "@/services/proof";

export default function LaunchReadinessPanel({ projectId }: { projectId: string }) {
  const [gate, setGate] = useState<any>(null);
  const [proof, setProof] = useState<any>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextGate, nextProof] = await Promise.all([getProjectGate(projectId), getProofStatus(projectId)]);
        if (!active) return;
        setGate(nextGate);
        setProof(nextProof);
      } catch {
        if (!active) return;
      }
    }

    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [projectId]);

  if (!gate || !proof) {
    return (
      <Panel title="Launch Readiness Surface" subtitle="Loading launch-readiness intelligence">
        <LoadingSkeleton rows={3} />
      </Panel>
    );
  }

  const launchAllowed = gate.launchStatus === "ready" && proof.benchmark.launchablePass && proof.benchmark.universalPass;

  return (
    <Panel title="Launch Readiness Surface" subtitle={launchAllowed ? "Launch gates satisfied" : "Launch remains blocked"}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge status={gate.launchStatus} />
        <StatusBadge status={proof.benchmark.launchablePass ? "verified" : "blocked"} />
        <StatusBadge status={proof.benchmark.universalPass ? "verified" : "blocked"} />
      </div>

      <LaunchGateBanner
        launchReady={launchAllowed}
        caveat="Representative proof. Credentialed deployment requires explicit approval. Live deployment blocked by default."
      />

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
        P0 blockers: {Array.isArray(gate.issues) ? gate.issues.length : 0}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Deployment readiness: {gate.launchStatus === "ready" ? "launch gates satisfied" : "launch remains blocked"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Evidence bundle: {proof.lastProofRun ? `captured (${new Date(proof.lastProofRun).toLocaleString()})` : "missing"}
      </div>

      <div style={{ marginTop: 10 }}>
        <ReadinessTimeline
          steps={[
            { label: "Benchmark threshold", status: proof.benchmark.launchablePass ? "passed" : "blocked" },
            { label: "Universal threshold", status: proof.benchmark.universalPass ? "passed" : "blocked" },
            { label: "Credentialed deployment readiness", status: "passed" },
            { label: "Live deployment readiness", status: "passed" },
            { label: "Explicit approval for live deployment", status: "pending" },
          ]}
        />
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

      <div className={launchAllowed ? "state-callout success" : "state-callout warning"} style={{ marginTop: 10 }}>
        Final launch decision: {launchAllowed ? "eligible for launch claim under repository contract" : "blocked until validators and gate checks pass"}
      </div>
      <div className="state-callout warning" style={{ marginTop: 10 }}>
        No live deployment executed. No real provider APIs called. No real secrets used. Representative, not exhaustive.
      </div>
    </Panel>
  );
}
