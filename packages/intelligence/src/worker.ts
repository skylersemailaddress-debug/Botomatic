import { runRambleAnalysis } from "./rambleEngine";
import { enrichMasterTruth } from "./enrichment";
import { saveRambleRecord } from "./store";

export async function runRambleWorker(input: {
  projectId: string;
  currentTruth: any;
}) {
  const analysis = runRambleAnalysis({
    projectId: input.projectId,
    currentTruth: input.currentTruth,
  });

  saveRambleRecord(analysis);

  const enriched = enrichMasterTruth(input.currentTruth, analysis.suggestions);

  return {
    enrichedTruth: enriched,
    suggestions: analysis.suggestions,
  };
}
