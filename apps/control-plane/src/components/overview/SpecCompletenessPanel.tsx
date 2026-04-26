"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";
import MetricCard from "@/components/ui/MetricCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function SpecCompletenessPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setData(await getSpecStatus(projectId));
      } catch {
        setData(null);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  if (!data) {
    return (
      <Panel title="Spec Completeness" subtitle="Loading readiness model">
        <LoadingSkeleton rows={2} />
      </Panel>
    );
  }

  const r = data.readiness || {};
  return (
    <Panel title="Spec Completeness" subtitle="Build contract readiness dimensions">
      <div className="surface-grid-3">
        <MetricCard label="Critical" value={r.criticalCompleteness ?? 0} />
        <MetricCard label="Commercial" value={r.commercialCompleteness ?? 0} />
        <MetricCard label="Implementation" value={r.implementationCompleteness ?? 0} />
        <MetricCard label="Launch" value={r.launchCompleteness ?? 0} />
        <MetricCard label="Risk" value={r.riskCompleteness ?? 0} />
        <MetricCard label="Build blocked" value={data.buildBlocked ? "Yes" : "No"} tone={data.buildBlocked ? "danger" : "success"} />
      </div>
      <div style={{ marginTop: 8 }} className={data.buildBlocked ? "state-callout warning" : "state-callout success"}>
        {data.buildBlocked ? "Build remains blocked until unresolved spec risk is closed." : "Spec readiness allows build progression under current contract."}
      </div>
    </Panel>
  );
}
