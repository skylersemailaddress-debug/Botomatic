import { saveAuditEventDB } from "../persistence/src/auditRepo";

export type AuditEvent = {
  eventId: string;
  actorId: string;
  action: string;
  resource: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export async function recordEventV2(event: Omit<AuditEvent, "eventId" | "timestamp">) {
  const entry: AuditEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  await saveAuditEventDB(entry);
  return entry;
}
