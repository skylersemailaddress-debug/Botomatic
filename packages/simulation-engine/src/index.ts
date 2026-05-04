import type { PredictionEntry, PredictionLedger } from "../../prediction-ledger/src";

export type SimulationScenario = {
  id: string;
  name: string;
  assumptions: string[];
  expectedOutcome: string;
};

export type SimulationResult = {
  scenarioId: string;
  confidenceShift: number;
  notes: string;
  verdict: "proceed" | "caution" | "block";
};

const NEGATIVE_KEYWORDS = ["risk", "regression", "security", "blocked", "fail", "vuln", "error", "breach"];
const POSITIVE_KEYWORDS = ["best", "clean", "fast", "optimal", "ideal", "success", "smooth"];

function getBaselineConfidence(ledger: PredictionLedger | PredictionEntry[], idx: number): number {
  // Handle both PredictionLedger and PredictionEntry[]
  if (Array.isArray(ledger)) {
    return ledger[idx % Math.max(ledger.length, 1)]?.confidence ?? 0.5;
  }
  // It's a PredictionLedger — use the ledger summary average confidence, or individual entries
  const entries = ledger.entries;
  if (entries && entries.length > 0) {
    return entries[idx % entries.length]?.confidence ?? ledger.ledgerSummary.averageConfidence ?? 0.5;
  }
  return ledger.ledgerSummary?.averageConfidence ?? 0.5;
}

function detectKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw));
}

export function runSimulation(
  scenarios: SimulationScenario[],
  ledger: PredictionLedger | PredictionEntry[]
): SimulationResult[] {
  return scenarios.map((scenario, idx) => {
    const baseline = getBaselineConfidence(ledger, idx);

    // Combine scenario name and assumptions into one searchable string
    const scenarioText = [scenario.name, ...scenario.assumptions, scenario.expectedOutcome].join(" ");

    const foundNegative = detectKeywords(scenarioText, NEGATIVE_KEYWORDS);
    const foundPositive = detectKeywords(scenarioText, POSITIVE_KEYWORDS);

    let confidenceShift = 0;

    if (foundNegative.length > 0) {
      // Scale negative shift: more keywords = worse shift, range -0.1 to -0.2
      confidenceShift = -(0.1 + Math.min(foundNegative.length - 1, 2) * 0.05);
    } else if (foundPositive.length > 0) {
      // Scale positive shift: more keywords = better shift, range +0.05 to +0.15
      confidenceShift = 0.05 + Math.min(foundPositive.length - 1, 2) * 0.05;
    } else {
      // Default: use baseline to determine direction
      confidenceShift = baseline >= 0.7 ? 0.05 : -0.05;
    }

    confidenceShift = Math.round(confidenceShift * 100) / 100;

    // Determine verdict
    let verdict: "proceed" | "caution" | "block";
    if (confidenceShift > 0.05) {
      verdict = "proceed";
    } else if (confidenceShift > -0.1) {
      verdict = "caution";
    } else {
      verdict = "block";
    }

    // Build notes explaining WHY
    let notes: string;
    if (foundNegative.length > 0) {
      notes = `Risk-heavy scenario detected negative keywords: ${foundNegative.join(", ")}. Confidence shift: ${confidenceShift > 0 ? "+" : ""}${confidenceShift}.`;
    } else if (foundPositive.length > 0) {
      notes = `Favorable scenario detected positive keywords: ${foundPositive.join(", ")}. Confidence shift: +${confidenceShift}.`;
    } else {
      notes = `Neutral scenario evaluated against baseline confidence ${baseline.toFixed(2)}. Shift applied by baseline heuristic.`;
    }

    return {
      scenarioId: scenario.id,
      confidenceShift,
      notes,
      verdict,
    };
  });
}
