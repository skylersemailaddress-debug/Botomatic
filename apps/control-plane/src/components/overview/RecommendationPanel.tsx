"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

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
    <Panel title="Recommendations">
      {recs.length === 0 ? <div style={{ fontSize: 12 }}>No recommendations yet.</div> : null}
      {recs.slice(0, 6).map((r, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
          {r.area}: {r.recommendation} ({r.status})
        </div>
      ))}
    </Panel>
  );
}
