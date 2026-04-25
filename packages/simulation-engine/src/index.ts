import type { PredictionEntry } from "../../prediction-ledger/src";

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
};

export function runSimulation(scenarios: SimulationScenario[], predictions: PredictionEntry[]): SimulationResult[] {
  return scenarios.map((scenario, idx) => {
    const baseline = predictions[idx % Math.max(predictions.length, 1)]?.confidence || 0.5;
    const confidenceShift = Number((baseline >= 0.7 ? 0.1 : -0.05).toFixed(2));
    return {
      scenarioId: scenario.id,
      confidenceShift,
      notes: `Scenario ${scenario.name} evaluated against current prediction baseline.`,
    };
  });
}
