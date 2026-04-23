import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getProjectAudit } from "@/services/audit";

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
    <Panel title="Audit Timeline">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>No audit events yet</div>
        )}
        {events.slice(0, 10).map((event, idx) => (
          <div key={event.id || idx} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{event.type}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              actor: {event.actorId || "unknown"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {event.timestamp || ""}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
