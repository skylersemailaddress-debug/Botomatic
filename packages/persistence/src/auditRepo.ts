import { pool } from "./dbClient";
import { AuditEvent } from "../../modules/audit";

export async function saveAuditEventDB(event: AuditEvent) {
  await pool.query(
    `INSERT INTO audit_events (event_id, actor_id, action, resource, timestamp, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [event.eventId, event.actorId, event.action, event.resource, event.timestamp, JSON.stringify(event.metadata || {})]
  );
}

export async function getAuditEventsDB(resource?: string): Promise<AuditEvent[]> {
  const res = resource
    ? await pool.query(`SELECT * FROM audit_events WHERE resource = $1 ORDER BY timestamp ASC`, [resource])
    : await pool.query(`SELECT * FROM audit_events ORDER BY timestamp ASC`);

  return res.rows.map((r) => ({
    eventId: r.event_id,
    actorId: r.actor_id,
    action: r.action,
    resource: r.resource,
    timestamp: r.timestamp,
    metadata: r.metadata || {},
  }));
}
