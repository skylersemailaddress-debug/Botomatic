export type PredictionEntry = {
  id: string;
  claim: string;
  confidence: number;
  rationale: string;
  createdAt: string;
};

export type LedgerSummary = {
  averageConfidence: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  overallVerdict: "confident" | "uncertain" | "blocked";
};

export type PredictionLedger = {
  entries: PredictionEntry[];
  ledgerSummary: LedgerSummary;
};

export type LedgerOptions = {
  readinessScore?: number;
  openQuestionCount?: number;
  riskCount?: number;
};

export function createPredictionLedger(
  rawEntries: Array<{ claim: string; confidence: number; rationale: string }>,
  options: LedgerOptions = {}
): PredictionLedger {
  const { readinessScore, openQuestionCount, riskCount } = options;

  const entries: PredictionEntry[] = rawEntries.map((entry, idx) => {
    let confidence = Math.max(0, Math.min(1, entry.confidence));

    // Adjust confidence based on context
    if (readinessScore !== undefined && readinessScore < 60) {
      confidence = Math.round(confidence * 0.7 * 100) / 100;
    }
    if (openQuestionCount !== undefined && openQuestionCount > 3) {
      confidence = Math.round(confidence * 0.8 * 100) / 100;
    }
    if (riskCount !== undefined && riskCount > 5) {
      confidence = Math.round(confidence * 0.85 * 100) / 100;
    }

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      id: `prediction_${idx + 1}`,
      claim: entry.claim,
      confidence,
      rationale: entry.rationale,
      createdAt: new Date().toISOString(),
    };
  });

  // Build ledger summary
  const totalConfidence = entries.reduce((sum, e) => sum + e.confidence, 0);
  const averageConfidence =
    entries.length > 0
      ? Math.round((totalConfidence / entries.length) * 100) / 100
      : 0;
  const highConfidenceCount = entries.filter((e) => e.confidence >= 0.7).length;
  const lowConfidenceCount = entries.filter((e) => e.confidence < 0.5).length;

  let overallVerdict: "confident" | "uncertain" | "blocked";
  if (averageConfidence >= 0.7 && lowConfidenceCount === 0) {
    overallVerdict = "confident";
  } else if (averageConfidence < 0.4 || lowConfidenceCount > highConfidenceCount) {
    overallVerdict = "blocked";
  } else {
    overallVerdict = "uncertain";
  }

  const ledgerSummary: LedgerSummary = {
    averageConfidence,
    highConfidenceCount,
    lowConfidenceCount,
    overallVerdict,
  };

  return { entries, ledgerSummary };
}
