export type DirtyRepoEvidenceEntry = {
  key: string;
  value: string;
  source: "intake" | "audit" | "risk" | "completion";
};

export type DirtyRepoEvidenceSnapshot = {
  capturedAt: string;
  evidenceEntries: DirtyRepoEvidenceEntry[];
  completionBlockers: string[];
};

export function createDirtyRepoEvidenceSnapshot(input: {
  detectedProduct: string;
  detectedStack: string[];
  blockers: string[];
  riskSignals?: string[];
  placeholderSignals?: string[];
}): DirtyRepoEvidenceSnapshot {
  const evidenceEntries: DirtyRepoEvidenceEntry[] = [
    { key: "detectedProduct", value: input.detectedProduct || "unknown", source: "intake" },
    { key: "detectedStack", value: (input.detectedStack || []).join(", ") || "unknown", source: "intake" },
    ...input.blockers.map((blocker, index) => ({ key: `blocker.${index + 1}`, value: blocker, source: "completion" as const })),
    ...(input.riskSignals || []).map((signal, index) => ({ key: `risk.${index + 1}`, value: signal, source: "risk" as const })),
    ...(input.placeholderSignals || []).map((signal, index) => ({ key: `placeholder.${index + 1}`, value: signal, source: "audit" as const })),
  ];

  return {
    capturedAt: new Date().toISOString(),
    evidenceEntries,
    completionBlockers: [...input.blockers],
  };
}
