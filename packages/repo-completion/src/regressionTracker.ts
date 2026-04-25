export type RegressionRecord = {
  step: string;
  status: "passed" | "failed";
  details: string;
};

export function summarizeRegression(records: RegressionRecord[]): { passed: number; failed: number } {
  return {
    passed: records.filter((record) => record.status === "passed").length,
    failed: records.filter((record) => record.status === "failed").length,
  };
}
