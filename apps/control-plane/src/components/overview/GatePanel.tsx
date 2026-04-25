"use client";

import { useEffect, useState } from "react";
import { getProjectGate } from "@/services/gate";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";

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

  if (!gate) return <Panel title="Launch Gate">Loading...</Panel>;

  return (
    <Panel title="Launch Gate">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <StatusBadge status={gate.launchStatus} />
        <StatusBadge status={gate.approvalStatus} />
      </div>
      <div style={{ marginTop: 8 }}>
        {gate.issues?.map((i: string, idx: number) => (
          <div key={idx} style={{ fontSize: 12, color: "var(--danger)" }}>
            {i}
          </div>
        ))}
      </div>
    </Panel>
  );
}
