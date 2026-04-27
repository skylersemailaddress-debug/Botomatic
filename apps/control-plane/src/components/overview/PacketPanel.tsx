"use client";

import { useEffect, useState } from "react";
import { getProjectPackets } from "@/services/packets";
import { replayRepair } from "@/services/actions";
import { getProjectGate } from "@/services/gate";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

export default function PacketPanel({ projectId }: { projectId: string }) {
  const [packets, setPackets] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<string>("operator");

  useEffect(() => {
    const load = async () => {
      const res: any = await getProjectPackets(projectId);
      setPackets(res.packets || []);
      const gate: any = await getProjectGate(projectId);
      setRole(gate.role || "operator");
    };
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  async function handleReplay() {
    setBusy(true);
    try {
      await replayRepair(projectId);
    } finally {
      setBusy(false);
    }
  }

  const blocked = packets.some((p) => p.status === "blocked" || p.status === "failed");
  const canReplay = role === "admin";

  return (
    <Panel title="Build Graph / Packets" subtitle="Packetized execution state">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Execution packets</strong>
        <button onClick={handleReplay} disabled={!blocked || busy || !canReplay} title={!canReplay ? "Replay repair requires admin role" : !blocked ? "Replay is only available when blocked or failed packets exist" : "Replay repair"}>
          {busy ? "Replaying..." : "Replay repair"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        Role: {role}
      </div>
      {packets.length === 0 ? <EmptyState title="No packets yet" detail="Compile and plan flows will populate packet graph execution units." /> : null}
      {packets.map((p) => (
        <div key={p.packetId} className="proof-status-card" style={{ marginTop: 8 }}>
          <div className="proof-status-header">
            <div className="proof-status-title">{p.packetId}</div>
            <StatusBadge status={p.status} />
          </div>
          <div className="proof-status-detail">{p.goal}</div>
          {(p.status === "blocked" || p.status === "failed") && (
            <div className="state-callout warning" style={{ marginTop: 6 }}>Requires repair before launch progression.</div>
          )}
        </div>
      ))}
    </Panel>
  );
}
