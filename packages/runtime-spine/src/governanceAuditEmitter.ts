export interface GovernanceAuditEvent {
  eventId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  eventType: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface GovernanceAuditEmitter {
  emit(event: GovernanceAuditEvent): Promise<void>;
}

export function createNoopGovernanceAuditEmitter(): GovernanceAuditEmitter {
  return {
    async emit(_event) {
      return;
    },
  };
}
