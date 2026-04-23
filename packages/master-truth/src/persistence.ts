import { MasterTruthV2 } from "./schema";

export type StoredTruthMetadata = {
  confidence: number;
  decision: string;
  assumptions: string[];
};

export function buildTruthMetadata(truth: MasterTruthV2 & { decision?: string }): StoredTruthMetadata {
  return {
    confidence: truth.confidence,
    decision: truth.decision || "unknown",
    assumptions: truth.assumptions || [],
  };
}
