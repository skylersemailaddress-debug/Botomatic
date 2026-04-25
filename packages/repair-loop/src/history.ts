import { FailureClass } from "./classifier";

export type RepairRecord = {
  id: string;
  failureClass: FailureClass;
  summary: string;
  fixApplied: string;
  passedAfterFix: boolean;
};

export function findSimilarRepairs(records: RepairRecord[], failureClass: FailureClass): RepairRecord[] {
  return records.filter((record) => record.failureClass === failureClass).slice(0, 5);
}
