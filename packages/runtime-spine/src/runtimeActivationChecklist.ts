export interface RuntimeActivationChecklist {
  ciProofPassed: boolean;
  migrationsValidated: boolean;
  observabilityOperational: boolean;
  dashboardsOperational: boolean;
  alertsOperational: boolean;
  rollbackValidated: boolean;
}

export interface RuntimeActivationChecklistResult {
  approved: boolean;
  failedChecks: string[];
}

export function evaluateRuntimeActivationChecklist(
  checklist: RuntimeActivationChecklist,
): RuntimeActivationChecklistResult {
  const failedChecks: string[] = [];

  for (const [key, value] of Object.entries(checklist)) {
    if (!value) {
      failedChecks.push(key);
    }
  }

  return {
    approved: failedChecks.length === 0,
    failedChecks,
  };
}
