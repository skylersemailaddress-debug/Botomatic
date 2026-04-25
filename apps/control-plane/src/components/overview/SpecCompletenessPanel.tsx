"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

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

  if (!data) return <Panel title="Spec Completeness">Loading...</Panel>;

  const r = data.readiness || {};
  return (
    <Panel title="Spec Completeness">
      <div style={{ fontSize: 12 }}>Critical: {r.criticalCompleteness ?? 0}</div>
      <div style={{ fontSize: 12 }}>Commercial: {r.commercialCompleteness ?? 0}</div>
      <div style={{ fontSize: 12 }}>Implementation: {r.implementationCompleteness ?? 0}</div>
      <div style={{ fontSize: 12 }}>Launch: {r.launchCompleteness ?? 0}</div>
      <div style={{ fontSize: 12 }}>Risk: {r.riskCompleteness ?? 0}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: data.buildBlocked ? "var(--danger)" : "var(--success, #16a34a)" }}>
        {data.buildBlocked ? "Build blocked" : "Build unblocked"}
      </div>
    </Panel>
  );
}
