import {
  SELF_UPGRADE_EXPLICIT_PHRASES,
  SELF_UPGRADE_FORBIDDEN_OVERRIDE_PHRASES,
  SELF_UPGRADE_NEGATION_PATTERNS,
  hasAnyPattern,
  hasAnyPhrase,
} from "./commandGrammar";

export type SelfUpgradeGuardResult = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
};

export function assertSelfUpgradeAllowed(input: string): { allowed: boolean; reason?: string } {
  const normalized = input.toLowerCase();
  const explicit = hasAnyPhrase(normalized, SELF_UPGRADE_EXPLICIT_PHRASES);
  if (!explicit) {
    return {
      allowed: false,
      reason: "Self-upgrade blocked because the user did not explicitly request Botomatic modification. This request has been routed to generated_app_build.",
    };
  }

  const hasForbiddenOverride = hasAnyPhrase(normalized, SELF_UPGRADE_FORBIDDEN_OVERRIDE_PHRASES);
  if (hasForbiddenOverride) {
    return {
      allowed: false,
      reason: "Self-upgrade blocked because this request targets uploaded/build-contract execution and must stay in generated_app_build or planning.",
    };
  }

  const hasNegatedSelfUpgrade = hasAnyPattern(normalized, SELF_UPGRADE_NEGATION_PATTERNS);
  if (hasNegatedSelfUpgrade) {
    return {
      allowed: false,
      reason: "Self-upgrade blocked because the request explicitly negates self-upgrade and has been routed to generated_app_build/planning.",
    };
  }

  return { allowed: true };
}

export function evaluateSelfUpgradeGuard(input: string): SelfUpgradeGuardResult {
  const normalized = input.toLowerCase();
  const allowed = assertSelfUpgradeAllowed(normalized);
  if (!allowed.allowed) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: allowed.reason,
    };
  }

  const confirmed = /(confirm self-upgrade|confirm self upgrade|yes, modify botomatic|approved self-upgrade)/.test(normalized);

  return {
    allowed: confirmed,
    requiresConfirmation: !confirmed,
    reason: confirmed
      ? undefined
      : "Self-upgrade request detected. Confirmation is required before creating a SelfUpgradeSpec. Reply with: confirm self-upgrade.",
  };
}
