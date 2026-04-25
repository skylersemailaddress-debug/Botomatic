"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

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

  if (!status) return <Panel title="Generated App Readiness">Loading...</Panel>;

  const score = status?.spec?.readinessScore || 0;
  const launchReady = !status.buildBlocked && score >= 90;

  return (
    <Panel title="Generated App Readiness">
      <div style={{ fontSize: 12 }}>Spec readiness score: {score}</div>
      <div style={{ fontSize: 12, color: launchReady ? "var(--success, #16a34a)" : "var(--danger)" }}>
        {launchReady ? "Potentially launch-ready (validator proof still required)." : "Not launch-ready."}
      </div>
    </Panel>
  );
}
