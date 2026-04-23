export type LaunchGateStatus = "not_started" | "blocked" | "ready";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type GateSummary = {
  launchStatus: LaunchGateStatus;
  approvalStatus: ApprovalStatus;
  issues: string[];
};
