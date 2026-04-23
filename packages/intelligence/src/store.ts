type RambleRecord = {
  projectId: string;
  suggestions: string[];
  generatedAt: string;
};

const rambleStore: Record<string, RambleRecord[]> = {};

export function saveRambleRecord(record: RambleRecord) {
  if (!rambleStore[record.projectId]) {
    rambleStore[record.projectId] = [];
  }
  rambleStore[record.projectId].push(record);
}

export function getRambleRecords(projectId: string): RambleRecord[] {
  return rambleStore[projectId] || [];
}
