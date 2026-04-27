import { compileConversationToMasterTruth } from "../../master-truth/src/compiler";
import type { MasterTruth } from "../../core-contracts/src/masterTruth";

export type ExtractedProductTruth = {
  masterTruth: MasterTruth;
  missingQuestions: string[];
  assumptions: string[];
};

export function extractProductTruth(input: {
  projectId: string;
  appName: string;
  messyInput: string;
}): ExtractedProductTruth {
  const masterTruth = compileConversationToMasterTruth({
    projectId: input.projectId,
    appName: input.appName,
    request: input.messyInput,
  });

  return {
    masterTruth,
    missingQuestions: masterTruth.canonicalSpec?.openQuestions || [],
    assumptions: masterTruth.assumptions,
  };
}

export function recommendArchitecture(truth: MasterTruth): { frontend: string; backend: string; jobs: string; deploy: string } {
  return {
    frontend: truth.stack.frontend || "Next.js",
    backend: truth.stack.backend || "Supabase",
    jobs: truth.stack.jobs || "Trigger.dev",
    deploy: truth.stack.deploy || "Vercel",
  };
}
