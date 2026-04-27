"use client";

import { useEffect, useState } from "react";
import { getProjectGate } from "@/services/gate";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function GatePanel({ projectId }: { projectId: string }) {
  const [gate, setGate] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const res = await getProjectGate(projectId);
      setGate(res);
    };
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  if (!gate) {
    return (
      <Panel title="Launch Gate" subtitle="Evaluating gate controls">
        <LoadingSkeleton rows={2} />
      </Panel>
    );
  }

  const hasIssues = Array.isArray(gate.issues) && gate.issues.length > 0;

  return (
    <Panel title="Launch Gate" subtitle={gate.launchStatus === "ready" ? "Launch gates satisfied" : "Launch remains blocked"}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <StatusBadge status={gate.launchStatus} />
        <StatusBadge status={gate.approvalStatus} />
        <StatusBadge status={gate.role || "operator"} />
      </div>
      <div style={{ marginTop: 8 }}>
        {hasIssues ? gate.issues.map((i: string, idx: number) => (
          <div key={idx} className="state-callout warning" style={{ marginBottom: 6 }}>
            {i}
          </div>
        )) : <EmptyState title="No launch blockers reported" detail="Gate controls are currently green for this project state." />}
      </div>
      <div className="state-callout warning" style={{ marginTop: 10 }}>
        Live deployment blocked by default. Credentialed deployment requires explicit approval.
      </div>
    </Panel>
  );
}
