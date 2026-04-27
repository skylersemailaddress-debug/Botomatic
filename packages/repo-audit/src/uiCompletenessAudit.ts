import { AuditResult } from "./repoHealthAudit";

export function uiCompletenessAudit(input: {
  responsive: boolean;
  hasLoadingState: boolean;
  hasEmptyState: boolean;
  hasErrorState: boolean;
}): AuditResult {
  const issues: string[] = [];
  if (!input.responsive) issues.push("Responsive UI requirements are incomplete.");
  if (!input.hasLoadingState) issues.push("Loading state missing.");
  if (!input.hasEmptyState) issues.push("Empty state missing.");
  if (!input.hasErrorState) issues.push("Error state missing.");
  return { ok: issues.length === 0, issues };
}
