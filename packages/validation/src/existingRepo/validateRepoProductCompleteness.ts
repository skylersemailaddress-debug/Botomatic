type RuleResult = { ok: boolean; issues: string[] };

export function validateRepoProductCompleteness(input: {
  coreWorkflowsComplete: boolean;
  dataPersistenceReal: boolean;
  uiStatesComplete: boolean;
}): RuleResult {
  const issues: string[] = [];
  if (!input.coreWorkflowsComplete) issues.push("Core workflows are not end-to-end.");
  if (!input.dataPersistenceReal) issues.push("Data model/persistence is not production-real.");
  if (!input.uiStatesComplete) issues.push("Loading/empty/error states are incomplete.");
  return { ok: issues.length === 0, issues };
}
