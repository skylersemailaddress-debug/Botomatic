import { useEffect, useState } from "react";
import { getProjectGate } from "@/services/gate";

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

  if (!gate) return <div style={{ padding: 16 }}>Loading gate...</div>;

  return (
    <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
      <strong>Launch Gate</strong>
      <div>Status: {gate.launchStatus}</div>
      <div>Approval: {gate.approvalStatus}</div>
      <div style={{ marginTop: 8 }}>
        {gate.issues?.map((i: string, idx: number) => (
          <div key={idx} style={{ color: "var(--danger)" }}>{i}</div>
        ))}
      </div>
    </div>
  );
}
