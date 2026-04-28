export type DirtyRepoEvidenceSeverity = "low" | "medium" | "high" | "critical";
export type DirtyRepoEvidenceSource = "commercial_audit" | "risk_fake_integration" | "risk_security" | "risk_placeholder" | "intake";
export type DirtyRepoEvidenceCategory = "commercial" | "integration" | "security" | "placeholder" | "intake";
export type DirtyRepoCompletionArea = "security" | "integrations" | "code_quality" | "launch_readiness" | "intake";

export type DirtyRepoEvidenceEntry = {
  id: string;
  source: DirtyRepoEvidenceSource;
  severity: DirtyRepoEvidenceSeverity;
  category: DirtyRepoEvidenceCategory;
  message: string;
  path?: string;
  logExcerpt?: string;
  manifestKey?: string;
  validatorId?: string;
  remediationHint?: string;
  completionArea?: DirtyRepoCompletionArea;
};

export type DirtyRepoCompletionBlocker = {
  id: string;
  area: DirtyRepoCompletionArea;
  message: string;
  severity: DirtyRepoEvidenceSeverity;
  evidenceEntryIds: string[];
};

export type DirtyRepoEvidenceSnapshot = {
  snapshotId: string;
  capturedAt: string;
  sources: DirtyRepoEvidenceSource[];
  entries: DirtyRepoEvidenceEntry[];
  summary: {
    totalEntries: number;
    bySeverity: Record<DirtyRepoEvidenceSeverity, number>;
    byCategory: Record<DirtyRepoEvidenceCategory, number>;
  };
};

function createSummary(entries: DirtyRepoEvidenceEntry[]): DirtyRepoEvidenceSnapshot["summary"] {
  const bySeverity: Record<DirtyRepoEvidenceSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const byCategory: Record<DirtyRepoEvidenceCategory, number> = { commercial: 0, integration: 0, security: 0, placeholder: 0, intake: 0 };
  for (const entry of entries) {
    bySeverity[entry.severity] += 1;
    byCategory[entry.category] += 1;
  }
  return { totalEntries: entries.length, bySeverity, byCategory };
}

export function createDirtyRepoEvidenceSnapshot(input: { snapshotId?: string; entries?: DirtyRepoEvidenceEntry[] }): DirtyRepoEvidenceSnapshot {
  const entries = [...(input.entries || [])];
  const sources = Array.from(new Set(entries.map((entry) => entry.source)));
  return {
    snapshotId: input.snapshotId || `dre_${Date.now()}`,
    capturedAt: new Date().toISOString(),
    sources,
    entries,
    summary: createSummary(entries),
  };
}

export function addDirtyRepoEvidenceEntry(snapshot: DirtyRepoEvidenceSnapshot, entry: DirtyRepoEvidenceEntry): DirtyRepoEvidenceSnapshot {
  const entries = [...snapshot.entries, entry];
  return {
    ...snapshot,
    sources: Array.from(new Set([...snapshot.sources, entry.source])),
    entries,
    summary: createSummary(entries),
  };
}

export function deriveDirtyRepoCompletionBlockers(snapshot: DirtyRepoEvidenceSnapshot): DirtyRepoCompletionBlocker[] {
  const blocking = snapshot.entries.filter((entry) => entry.severity === "high" || entry.severity === "critical");
  return blocking.map((entry, index) => ({
    id: `blocker_${index + 1}`,
    area: entry.completionArea || defaultArea(entry.category),
    message: entry.message,
    severity: entry.severity,
    evidenceEntryIds: [entry.id],
  }));
}

export function summarizeDirtyRepoEvidence(snapshot: DirtyRepoEvidenceSnapshot): string {
  return `entries=${snapshot.summary.totalEntries}; critical=${snapshot.summary.bySeverity.critical}; high=${snapshot.summary.bySeverity.high}; security=${snapshot.summary.byCategory.security}`;
}

function defaultArea(category: DirtyRepoEvidenceCategory): DirtyRepoCompletionArea {
  if (category === "security") return "security";
  if (category === "integration") return "integrations";
  if (category === "placeholder") return "code_quality";
  if (category === "commercial") return "launch_readiness";
  return "intake";
}
