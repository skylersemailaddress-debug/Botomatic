"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

export default function RecommendationPanel({ projectId }: { projectId: string }) {
  const [recs, setRecs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getSpecStatus(projectId);
        setRecs(Array.isArray(status?.spec?.recommendations) ? status.spec.recommendations : []);
      } catch {
        setRecs([]);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Recommendations" subtitle="Product and execution guidance">
      {recs.length === 0 ? <EmptyState title="No recommendations" detail="No recommendation entries are currently published." /> : null}
      {recs.slice(0, 6).map((r, i) => (
        <div key={i} className="proof-status-card" style={{ marginBottom: 6 }}>
          <div className="proof-status-header">
            <div className="proof-status-title">{r.area || "General"}</div>
            <StatusBadge status={r.status || "pending"} />
          </div>
          <div className="proof-status-detail">{r.recommendation || "No recommendation text provided"}</div>
        </div>
      ))}
    </Panel>
  );
}
