export type RunLogEntry = {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  details?: Record<string, unknown>;
};

export type PacketRunRecord = {
  projectId: string;
  packetId: string;
  status: "queued" | "executing" | "validating" | "failed" | "complete";
  retryCount: number;
  logs: RunLogEntry[];
};

export function createRunRecord(projectId: string, packetId: string): PacketRunRecord {
  return {
    projectId,
    packetId,
    status: "queued",
    retryCount: 0,
    logs: []
  };
}

export function appendLog(record: PacketRunRecord, entry: Omit<RunLogEntry, "timestamp">): PacketRunRecord {
  return {
    ...record,
    logs: [
      ...record.logs,
      {
        timestamp: new Date().toISOString(),
        ...entry
      }
    ]
  };
}
