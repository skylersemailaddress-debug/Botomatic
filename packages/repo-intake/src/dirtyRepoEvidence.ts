export type DirtyRepoEvidenceSeverity = "info" | "warning" | "critical";

export type DirtyRepoEvidenceSource =
  | "intake_artifact"
  | "repo_manifest"
  | "validator"
  | "audit"
  | "operator_summary";

export type DirtyRepoEvidenceCategory =
  | "file_path"
  | "log"
  | "manifest"
  | "validator"
  | "policy"
  | "workflow"
  | "security"
  | "test"
  | "deployment"
  | "placeholder";

export type DirtyRepoCompletionArea =
  | "build"
  | "tests"
  | "security"
  | "data"
  | "ui"
  | "deployment"
  | "workflow"
  | "placeholder"
  | "integrations";

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
    byCategory: Partial<Record<DirtyRepoEvidenceCategory, number>>;
  };
};

export function createDirtyRepoEvidenceSnapshot(input?: {
  snapshotId?: string;
  capturedAt?: string;
  sources?: DirtyRepoEvidenceSource[];
  entries?: DirtyRepoEvidenceEntry[];
}): DirtyRepoEvidenceSnapshot {
  const snapshot: DirtyRepoEvidenceSnapshot = {
    snapshotId: input?.snapshotId || `dirty_repo_evidence_${Date.now()}`,
    capturedAt: input?.capturedAt || new Date().toISOString(),
    sources: Array.from(new Set(input?.sources || [])),
    entries: input?.entries ? [...input.entries] : [],
    summary: {
      totalEntries: 0,
      bySeverity: { info: 0, warning: 0, critical: 0 },
      byCategory: {},
    },
  };
  return summarizeDirtyRepoEvidence(snapshot);
}

export function addDirtyRepoEvidenceEntry(
  snapshot: DirtyRepoEvidenceSnapshot,
  entry: DirtyRepoEvidenceEntry,
): DirtyRepoEvidenceSnapshot {
  const next = {
    ...snapshot,
    sources: Array.from(new Set([...snapshot.sources, entry.source])),
    entries: [...snapshot.entries, entry],
  };
  return summarizeDirtyRepoEvidence(next);
}

export function deriveDirtyRepoCompletionBlockers(snapshot: DirtyRepoEvidenceSnapshot): DirtyRepoCompletionBlocker[] {
  const blockers = new Map<string, DirtyRepoCompletionBlocker>();
  for (const entry of snapshot.entries) {
    if (entry.severity === "info") continue;
    const area = entry.completionArea || inferCompletionArea(entry);
    const key = `${area}:${entry.message}`;
    const existing = blockers.get(key);
    if (existing) {
      existing.evidenceEntryIds.push(entry.id);
      if (entry.severity === "critical") existing.severity = "critical";
      continue;
    }
    blockers.set(key, {
      id: `blocker_${blockers.size + 1}`,
      area,
      message: entry.message,
      severity: entry.severity,
      evidenceEntryIds: [entry.id],
    });
  }
  return [...blockers.values()];
}

export function summarizeDirtyRepoEvidence(snapshot: DirtyRepoEvidenceSnapshot): DirtyRepoEvidenceSnapshot {
  const bySeverity: Record<DirtyRepoEvidenceSeverity, number> = { info: 0, warning: 0, critical: 0 };
  const byCategory: Partial<Record<DirtyRepoEvidenceCategory, number>> = {};
  for (const entry of snapshot.entries) {
    bySeverity[entry.severity] += 1;
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  }
  return {
    ...snapshot,
    summary: {
      totalEntries: snapshot.entries.length,
      bySeverity,
      byCategory,
    },
  };
}

function inferCompletionArea(entry: DirtyRepoEvidenceEntry): DirtyRepoCompletionArea {
  switch (entry.category) {
    case "security":
      return "security";
    case "test":
      return "tests";
    case "deployment":
      return "deployment";
    case "placeholder":
      return "placeholder";
    case "workflow":
      return "workflow";
    case "manifest":
      return "data";
    case "validator":
      return "build";
    default:
      return "build";
  }
}
