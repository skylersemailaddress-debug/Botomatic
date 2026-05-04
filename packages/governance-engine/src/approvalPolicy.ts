/**
 * PHASE 2: Orchestrator Autonomous Approval Policy Engine
 * 
 * Enables controlled progression past architecture approval gates
 * when conditions are safe, while preserving governance for high-risk decisions.
 * 
 * Modes:
 * - strict: Manual approval required for all gates
 * - guided: Auto-approve low-risk, escalate high-risk  
 * - autopilot: Auto-approve all safe conditions (DEFAULT for private beta)
 * - enterprise: Full governance + all safety checks
 */

export type ApprovalMode = 'strict' | 'guided' | 'autopilot' | 'enterprise';

export interface ApprovalDecision {
  approved: boolean;
  mode: ApprovalMode;
  reason: string;
  autoApprovedAt?: string;
  conditions: {
    contractComplete: boolean;
    noHighRiskDecisions: boolean;
    blueprintSelected: boolean;
    noConflicts: boolean;
  };
  highRiskDecisions: string[];
}

export interface ApprovalPolicyConfig {
  mode: ApprovalMode;
  contractCompletenessThreshold: number;
  allowAutoApprovalWithoutIntake: boolean;
  logAllApprovals: boolean;
}

export const DEFAULT_APPROVAL_POLICY: ApprovalPolicyConfig = {
  mode: 'autopilot',
  contractCompletenessThreshold: 0.7,
  allowAutoApprovalWithoutIntake: true,  // For chat-first UX
  logAllApprovals: true,
};

/**
 * Evaluates whether a project can auto-approve architecture gate
 * under the given approval mode.
 */
export function canAutoApprove(
  project: any,
  config: ApprovalPolicyConfig = DEFAULT_APPROVAL_POLICY
): ApprovalDecision {
  const decision: ApprovalDecision = {
    approved: false,
    mode: config.mode,
    reason: '',
    conditions: {
      contractComplete: false,
      noHighRiskDecisions: false,
      blueprintSelected: false,
      noConflicts: false,
    },
    highRiskDecisions: [],
  };

  // Strict mode: never auto-approve
  if (config.mode === 'strict') {
    decision.reason = 'Approval mode is strict; manual approval required.';
    return decision;
  }

  // Enterprise mode: require all approvals
  if (config.mode === 'enterprise') {
    decision.reason = 'Approval mode is enterprise; full governance required.';
    return decision;
  }

  // Check Contract Completeness
  const contract = getContractFromProject(project);
  if (!contract) {
    decision.reason = 'No build contract found.';
    return decision;
  }

  const completeness = evaluateContractCompleteness(contract);
  if (completeness < config.contractCompletenessThreshold) {
    decision.reason = `Contract completeness ${(completeness * 100).toFixed(1)}% below threshold ${(config.contractCompletenessThreshold * 100).toFixed(1)}%.`;
    return decision;
  }
  decision.conditions.contractComplete = true;

  // Check High-Risk Decisions
  const spec = getMasterSpecFromProject(project);
  const highRisk = identifyHighRiskDecisions(
    {
      ...spec,
      request: spec?.request || project?.request || contract?.appSummary || "",
    },
    contract
  );
  if (highRisk.length > 0) {
    decision.highRiskDecisions = highRisk;
    if (config.mode === 'autopilot') {
      // In autopilot, escalate but continue for lower-risk items
      decision.reason = `High-risk decisions detected: ${highRisk.join('; ')}. Escalating.`;
      return decision;
    }
    // Guided mode: only block on certain high-risk items
    if (config.mode === 'guided') {
      const critical = highRisk.filter((r) =>
        ['live_deployment', 'paid_provider', 'destructive_rewrite'].includes(r)
      );
      if (critical.length > 0) {
        decision.reason = `Critical decisions require approval: ${critical.join('; ')}`;
        return decision;
      }
      decision.conditions.noHighRiskDecisions = true;
    }
  } else {
    decision.conditions.noHighRiskDecisions = true;
  }

  // Check Blueprint Selected
  if (!hasBlueprintSelected(project)) {
    decision.reason = 'No blueprint matched. Cannot proceed without architecture selection.';
    return decision;
  }
  decision.conditions.blueprintSelected = true;

  // Check Conflicting Requirements
  if (hasConflictingRequirements(spec)) {
    decision.reason = 'Conflicting requirements detected in spec. Cannot auto-approve.';
    return decision;
  }
  decision.conditions.noConflicts = true;

  // All conditions met for autopilot/guided
  decision.approved = true;
  decision.autoApprovedAt = new Date().toISOString();
  decision.reason = `Auto-approved in ${config.mode} mode. Proceeding to plan generation.`;
  
  return decision;
}

/**
 * Calculates contract completeness score (0-1).
 */
function evaluateContractCompleteness(contract: any): number {
  if (!contract) return 0;

  const required = ['appSummary', 'acceptanceCriteria', 'launchCriteria', 'workflows', 'deploymentTarget'];
  const present = required.filter((key) => Boolean(contract[key])).length;

  return present / required.length;
}

/**
 * Identifies high-risk decisions that may require escalation.
 */
function identifyHighRiskDecisions(spec: any, contract: any): string[] {
  const risks: string[] = [];

  if (!spec || !contract) return risks;

  // Use spec.request (MasterSpec) or spec.coreValue (MasterTruth) — whichever is available
  const req = (spec.request || spec.coreValue || '').toLowerCase();

  // Live deployment risk — require actionable deployment phrases, not adjectives like "production-realistic"
  if (/\bdeploy\s+(to\s+)?prod|\blaunch\s+to\s+prod|\bgo\s+live\b|\bproduction\s+deploy|\bdeploy\s+live\b/.test(req) ||
      /\bto\s+production\b|\bin\s+production\b/.test(req)) {
    risks.push('live_deployment');
  }

  // Paid provider risk — keyword match on request text or spec.payments array
  if (/\bstripe\b|\bpaypal\b|\bbraintree\b|\bsquare\b|\badyen\b/.test(req) ||
      (Array.isArray(spec.payments) && spec.payments.length > 0)) {
    risks.push('paid_provider');
  }

  // Destructive operations risk
  if (req.includes('delete') || req.includes('migrate') || req.includes('drop')) {
    risks.push('destructive_rewrite');
  }

  // Unresolved spec questions — only when spec has openQuestions at top level (MasterSpec path)
  const openQuestions: string[] = Array.isArray(spec.openQuestions) ? spec.openQuestions
    : Array.isArray(spec.unresolvedSecurityDecisions) ? spec.unresolvedSecurityDecisions
    : [];
  if (openQuestions.length > 0) {
    risks.push('unresolved_spec_questions');
  }

  // Unresolved high-risk assumptions — only when assumptions are structured objects (MasterSpec path)
  const assumptions: any[] = Array.isArray(spec.assumptions) ? spec.assumptions : [];
  const unresolvedHighRisk = assumptions.filter(
    (a) => typeof a === 'object' && a !== null && a.risk === 'high' && a.requiresApproval && !a.approved
  );
  if (unresolvedHighRisk.length > 0) {
    risks.push('unresolved_security');
  }

  // Privacy/compliance signals in request text
  if (req.includes('pii') || req.includes('gdpr') || req.includes('hipaa')) {
    risks.push('privacy_compliance');
  }

  return risks;
}

/**
 * Checks for conflicting requirements in spec.
 */
function hasConflictingRequirements(spec: any): boolean {
  if (!spec) return false;

  const text = String(spec.request || '').toLowerCase();

  // Common conflicts
  const conflicts = [
    ['serverless', 'stateful database'],
    ['no database', 'persistent data'],
    ['real-time', 'no websocket'],
    ['offline-first', 'sync to cloud'],
  ];

  for (const [conflict1, conflict2] of conflicts) {
    if (text.includes(conflict1) && text.includes(conflict2)) {
      return true;
    }
  }

  return false;
}

function getContractFromProject(project: any): any {
  return project?.buildContract || project?.contract || project?.runs?.__buildContract || null;
}

function getMasterSpecFromProject(project: any): any {
  return project?.masterTruth || project?.spec || project?.runs?.__masterSpec || null;
}

function hasBlueprintSelected(project: any): boolean {
  return Boolean(
    project?.blueprint ||
    project?.masterTruth?.blueprint ||
    project?.runs?.__masterSpec?.blueprint ||
    project?.masterTruth?.canonicalSpec?.appType ||
    project?.masterTruth?.appType ||
    project?.runs?.__masterSpec?.appType
  );
}

/**
 * Formats approval decision for logging and audit.
 */
export function formatApprovalDecision(decision: ApprovalDecision): string {
  return [
    `Approval Decision: ${decision.approved ? 'APPROVED' : 'BLOCKED'}`,
    `Mode: ${decision.mode}`,
    `Reason: ${decision.reason}`,
    `Conditions: [${Object.entries(decision.conditions)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}]`,
    decision.highRiskDecisions.length > 0
      ? `High-Risk Items: [${decision.highRiskDecisions.join(', ')}]`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}
