import { useEffect, useState } from "react";
import { getDeploymentHistory } from "@/services/deployments";
import Panel from "@/components/ui/Panel";

export default function DeploymentHistoryPanel({ projectId }: { projectId: string }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getDeploymentHistory(projectId);
        setHistory(res.history || []);
      } catch {
        // silent
      }
    };

    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Deployment History">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>
            No history yet
          </div>
        )}
        {history.slice(0, 10).map((h, i) => (
          <div key={i} style={{ fontSize: 12 }}>
            {h.action} → {h.environment} ({new Date(h.timestamp).toLocaleTimeString()})
          </div>
        ))}
      </div>
    </Panel>
  );
}
