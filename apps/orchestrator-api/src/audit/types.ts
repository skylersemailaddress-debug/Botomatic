export type AuditEventType =
  | "intake"
  | "compile"
  | "plan"
  | "execute_packet"
  | "packet_failed"
  | "repair_replay"
  | "validation"
  | "promote"
  | "rollback";

export type AuditEvent = {
  id: string;
  projectId: string;
  type: AuditEventType;
  actorId: string;
  role?: string;
  timestamp: string;
  metadata?: Record<string, any>;
};
