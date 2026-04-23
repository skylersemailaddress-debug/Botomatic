import { useEffect, useState } from "react";
import { getProjectPackets } from "@/services/packets";

export default function PacketPanel({ projectId }: { projectId: string }) {
  const [packets, setPackets] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res: any = await getProjectPackets(projectId);
      setPackets(res.packets || []);
    };
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <div style={{ padding: 16 }}>
      <strong>Packets</strong>
      {packets.map((p) => (
        <div key={p.packetId} style={{ border: "1px solid var(--border)", padding: 8, marginTop: 8 }}>
          <div>{p.packetId}</div>
          <div>Status: {p.status}</div>
          <div>{p.goal}</div>
        </div>
      ))}
    </div>
  );
}
