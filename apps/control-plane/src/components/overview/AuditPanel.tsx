"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getProjectAudit } from "@/services/audit";
import EmptyState from "@/components/ui/EmptyState";

export default function AuditPanel({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await getProjectAudit(projectId);
        setEvents(res.events || []);
      } catch {
        // keep panel stable when auth or network fails
      }
    };

    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Audit Timeline" subtitle="Validator-backed event evidence">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.length === 0 ? <EmptyState title="No audit events yet" detail="Events will appear as compile, plan, execute, and governance actions run." /> : null}
        {events.slice(0, 10).map((event, idx) => (
          <div key={event.id || idx} className="proof-status-card">
            <div className="proof-status-title">{event.type}</div>
            <div className="proof-status-detail">
              actor: {event.actorId || "unknown"}
            </div>
            <div className="proof-status-detail">
              {event.timestamp || ""}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
