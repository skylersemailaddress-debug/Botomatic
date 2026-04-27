import { SELF_UPGRADE_EXPLICIT_PHRASES, hasAnyPhrase } from "./commandGrammar";

export type SelfUpgradeGuardResult = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
};

export function evaluateSelfUpgradeGuard(input: string): SelfUpgradeGuardResult {
  const normalized = input.toLowerCase();
  const explicit = hasAnyPhrase(normalized, SELF_UPGRADE_EXPLICIT_PHRASES);

  if (!explicit) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Self-upgrade blocked because the user did not explicitly request Botomatic modification. This request has been routed to generated_app_build.",
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
