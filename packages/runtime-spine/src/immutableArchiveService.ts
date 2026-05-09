export interface ImmutableArchiveRecord {
  archiveId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  category: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface ImmutableArchiveService {
  append(record: ImmutableArchiveRecord): Promise<void>;
}

export function createMemoryImmutableArchiveService(): ImmutableArchiveService {
  const records: ImmutableArchiveRecord[] = [];

  return {
    async append(record) {
      records.push(record);
    },
  };
}
