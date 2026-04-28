import { createCompletionPlan } from "../../repo-repair/src/completionPlanner";
import {
  createDirtyRepoEvidenceSnapshot,
  type DirtyRepoCompletionBlocker,
  type DirtyRepoEvidenceEntry,
  type DirtyRepoEvidenceSnapshot,
} from "../../repo-intake/src/dirtyRepoEvidence";

export type CompletionContract = {
  detectedProduct: string;
  detectedStack: string[];
  currentState: string;
  brokenAreas: string[];
  missingAreas: string[];
  placeholderAreas: string[];
  securityGaps: string[];
  dataModelGaps: string[];
  uxGaps: string[];
  testGaps: string[];
  deploymentGaps: string[];
  commercialLaunchBlockers: string[];
  recommendedCompletionPlan: string[];
  mustAnswerQuestions: string[];
  safeAssumptions: string[];
  definitionOfDone: string[];
  evidenceSnapshot: DirtyRepoEvidenceSnapshot;
  evidenceEntries: DirtyRepoEvidenceEntry[];
  completionBlockers: DirtyRepoCompletionBlocker[];
};

export function runCompletionContract(input: {
  detectedProduct: string;
  detectedStack: string[];
  blockers: string[];
  evidenceSnapshot?: DirtyRepoEvidenceSnapshot;
  completionBlockers?: DirtyRepoCompletionBlocker[];
}): CompletionContract {
  const phases = createCompletionPlan({ blockers: input.blockers });
  const evidenceSnapshot = input.evidenceSnapshot || createDirtyRepoEvidenceSnapshot({ entries: [] });
  const completionBlockers = input.completionBlockers || [];

  return {
    detectedProduct: input.detectedProduct,
    detectedStack: input.detectedStack,
    currentState: "ingested_existing_repo",
    brokenAreas: input.blockers,
    missingAreas: [],
    placeholderAreas: [],
    securityGaps: [],
    dataModelGaps: [],
    uxGaps: [],
    testGaps: [],
    deploymentGaps: [],
    commercialLaunchBlockers: input.blockers,
    recommendedCompletionPlan: phases.map((phase) => `${phase.title}: ${phase.goals.join(", ")}`),
    mustAnswerQuestions: ["Which launch workflows are non-negotiable?"],
    safeAssumptions: ["Preserve working user code unless replacement is approved"],
    definitionOfDone: [
      "Install/build/test path is stable",
      "No placeholders in production paths",
      "Security/deployment validators pass",
      "Proof ledger entry is recorded",
    ],
    evidenceSnapshot,
    evidenceEntries: evidenceSnapshot.entries,
    completionBlockers,
  };
}
