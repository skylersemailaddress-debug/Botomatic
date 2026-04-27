export type PredictionEntry = {
  id: string;
  claim: string;
  confidence: number;
  rationale: string;
  createdAt: string;
};

export function createPredictionLedger(entries: Array<{ claim: string; confidence: number; rationale: string }>): PredictionEntry[] {
  return entries.map((entry, idx) => ({
    id: `prediction_${idx + 1}`,
    claim: entry.claim,
    confidence: Math.max(0, Math.min(1, entry.confidence)),
    rationale: entry.rationale,
    createdAt: new Date().toISOString(),
  }));
}
