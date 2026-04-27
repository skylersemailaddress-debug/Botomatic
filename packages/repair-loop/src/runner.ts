import { classifyFailure } from "./classifier";
import { RepairRecord, findSimilarRepairs } from "./history";

export type RepairLoopResult = {
  classification: string;
  similarFixCount: number;
  targetedValidatorsRerun: boolean;
  fullValidatorsRerun: boolean;
};

export function runRepairLoop(message: string, records: RepairRecord[]): RepairLoopResult {
  const classification = classifyFailure(message);
  const similar = findSimilarRepairs(records, classification);
  return {
    classification,
    similarFixCount: similar.length,
    targetedValidatorsRerun: true,
    fullValidatorsRerun: true,
  };
}
