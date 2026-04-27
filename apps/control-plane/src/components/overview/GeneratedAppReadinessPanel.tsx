"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import MetricCard from "@/components/ui/MetricCard";

export default function GeneratedAppReadinessPanel({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setStatus(await getSpecStatus(projectId));
      } catch {
        setStatus(null);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  if (!status) {
    return (
      <Panel title="Generated App Readiness" subtitle="Evaluating generated output posture">
        <LoadingSkeleton rows={2} />
      </Panel>
    );
  }

  const score = status?.spec?.readinessScore || 0;
  const launchReady = !status.buildBlocked && score >= 90;

  return (
    <Panel title="Generated App Readiness" subtitle="Representative proof posture">
      <div className="surface-grid-2">
        <MetricCard label="Spec readiness score" value={score} tone={launchReady ? "success" : "warning"} />
        <MetricCard label="Build blocked" value={status.buildBlocked ? "Yes" : "No"} tone={status.buildBlocked ? "danger" : "success"} />
      </div>
      <div style={{ marginTop: 10 }} className={launchReady ? "state-callout success" : "state-callout warning"}>
        {launchReady
          ? "Representative proof indicates launch-quality generated output. Validator-backed evidence remains the source of launch truth."
          : "Readiness criteria are not yet satisfied for launch-quality generated output."}
      </div>
      <div className="state-callout warning" style={{ marginTop: 10 }}>
        Representative, not exhaustive across every blueprint, integration, and provider permutation.
      </div>
    </Panel>
  );
}
