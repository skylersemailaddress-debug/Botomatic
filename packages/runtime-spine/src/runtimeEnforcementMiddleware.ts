import type { RuntimeActivationChecklist } from './runtimeActivationChecklist.js';
import { evaluateRuntimeActivationChecklist } from './runtimeActivationChecklist.js';

export interface RuntimeEnforcementDecision {
  allowed: boolean;
  violations: string[];
}

export function enforceRuntimeActivation(checklist: RuntimeActivationChecklist): RuntimeEnforcementDecision {
  const result = evaluateRuntimeActivationChecklist(checklist);

  return {
    allowed: result.approved,
    violations: result.failedChecks,
  };
}
