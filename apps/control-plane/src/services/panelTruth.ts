export const panelTruth = {
  notConnected: "Not Connected",
  unavailable: "Unavailable",
  empty: "No data available",
  unknown: "Unknown",
  notRun: "Not run",
  proofMissing: "Proof missing",
  backendUnavailable: "Backend state unavailable",
  serviceHealthNotConnected: "Service health not connected",
  databaseNotConnected: "Database not connected",
  noTestRunYet: "No test run yet",
  noTerminalLogsYet: "No terminal logs yet",
  noCommitsAvailable: "No commits available",
  healthCheckNotRun: "Health check not run",
  previewUnavailable: "Preview unavailable",
  runtimeNotConnected: "Runtime not connected",
  noCodeChangesAvailable: "No code changes available",
  repositoryDiffNotConnected: "Repository diff not connected",
  noCopilotActivityYet: "No Copilot activity yet",
  noRecentActivity: "No recent activity",
  projectStateUnavailable: "Project state unavailable",
} as const;

export function hasItems<T>(value: T[] | undefined | null): value is T[] {
  return Array.isArray(value) && value.length > 0;
}
