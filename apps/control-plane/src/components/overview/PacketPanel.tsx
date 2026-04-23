import { useEffect, useState } from "react";
import { getProjectPackets } from "@/services/packets";
import { replayRepair } from "@/services/actions";
import { getProjectGate } from "@/services/gate";

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
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Packets</strong>
        <button onClick={handleReplay} disabled={!blocked || busy || !canReplay}>
          {busy ? "Replaying..." : "Replay repair"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        Role: {role}
      </div>
      {packets.map((p) => (
        <div key={p.packetId} style={{ border: "1px solid var(--border)", padding: 8, marginTop: 8 }}>
          <div>{p.packetId}</div>
          <div>Status: {p.status}</div>
          <div>{p.goal}</div>
          {(p.status === "blocked" || p.status === "failed") && (
            <div style={{ color: "var(--danger)", marginTop: 4 }}>Requires repair</div>
          )}
        </div>
      ))}
    </div>
  );
}
