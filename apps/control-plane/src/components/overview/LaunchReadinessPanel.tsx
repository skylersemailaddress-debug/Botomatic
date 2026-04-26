"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
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
    return <Panel title="Launch Readiness Surface"><div className="skeleton" /></Panel>;
  }

  const launchAllowed = gate.launchStatus === "ready" && proof.benchmark.launchablePass && proof.benchmark.universalPass;

  return (
    <Panel title="Launch Readiness Surface" subtitle={launchAllowed ? "Launch gate satisfied" : "Launch remains blocked"}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge status={gate.launchStatus} />
        <StatusBadge status={proof.benchmark.launchablePass ? "verified" : "blocked"} />
        <StatusBadge status={proof.benchmark.universalPass ? "verified" : "blocked"} />
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        P0 blockers: {Array.isArray(gate.issues) ? gate.issues.length : 0}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Deployment readiness: {gate.launchStatus === "ready" ? "ready" : "not ready"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Evidence bundle: {proof.lastProofRun ? `captured (${new Date(proof.lastProofRun).toLocaleString()})` : "missing"}
      </div>

      <div className={launchAllowed ? "state-callout success" : "state-callout warning"} style={{ marginTop: 10 }}>
        Final launch decision: {launchAllowed ? "eligible for launch claim" : "blocked until validators and gate checks pass"}
      </div>
    </Panel>
  );
}
