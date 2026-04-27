"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

export default function LaunchBlockersPanel({ projectId }: { projectId: string }) {
  const [blockers, setBlockers] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getSpecStatus(projectId);
        setBlockers(Array.isArray(status?.blockers) ? status.blockers : []);
      } catch {
        setBlockers([]);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Launch Blockers">
      {blockers.length === 0 ? <div style={{ fontSize: 12 }}>No blockers reported.</div> : null}
      {blockers.map((b, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>{b}</div>
      ))}
    </Panel>
  );
}
