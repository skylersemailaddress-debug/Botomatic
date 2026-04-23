export type AuditEvent = {
  eventId: string;
  actorId: string;
  action: string;
  resource: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

const auditLog: AuditEvent[] = [];

export function recordEvent(event: Omit<AuditEvent, "eventId" | "timestamp">) {
  const entry: AuditEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  auditLog.push(entry);
  return entry;
}

export function getAuditLog(): AuditEvent[] {
  return auditLog;
}
