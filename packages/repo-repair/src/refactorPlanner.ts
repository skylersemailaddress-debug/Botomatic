export function shouldRefactor(input: { patchCount: number; architectureRiskHigh: boolean; userApprovedRewrite: boolean }): boolean {
  if (input.userApprovedRewrite && input.architectureRiskHigh) return true;
  return input.patchCount > 20 && input.architectureRiskHigh;
}
