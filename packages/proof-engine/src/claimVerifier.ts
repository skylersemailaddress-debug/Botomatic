import {
  ProofClaimType,
  ProofEvidenceClass,
  ProofEvidenceRef,
  ProofLedgerEntry,
  ProofLedgerOutcome,
} from "./proofLedger";

export type ProofEvidenceFreshness = {
  maxEvidenceAgeMs?: number;
  now?: string | Date;
};

export type ProofClaimEligibility = {
  readinessEligible: boolean;
  reason?: string;
};

export type ProofClaimVerificationResult = {
  recordValid: boolean;
  readinessEligible: boolean;
  errors: string[];
  warnings: string[];
  requiredEvidenceClasses: ProofEvidenceClass[];
  suppliedEvidenceClasses: ProofEvidenceClass[];
  claimType: ProofClaimType;
  outcome: ProofLedgerOutcome;
  freshness?: ProofEvidenceFreshness;
};

function parseNow(now?: string | Date): Date {
  return now ? new Date(now) : new Date();
}

export function classifyClaimType(entry: ProofLedgerEntry): ProofClaimType {
  if (entry.claimType) return entry.claimType;

  const text = `${entry.claim} ${entry.validatorSummary}`.toLowerCase();
  if (entry.scope === "self_upgrade" || text.includes("self-upgrade") || text.includes("self upgrade")) {
    return "self_upgrade_claim";
  }
  if (text.includes("live deployment") || text.includes("production deployment")) {
    return "live_deployment_claim";
  }
  if (text.includes("deployment readiness") || text.includes("credentialed")) {
    return "deployment_readiness_claim";
  }
  if (text.includes("candidate")) {
    return "candidate_readiness_claim";
  }
  if (text.includes("readiness") || text.includes("ready")) {
    return "readiness_claim";
  }
  return "documentation_claim";
}

export function requiredEvidenceClassesForClaim(claimType: ProofClaimType): ProofEvidenceClass[] {
  switch (claimType) {
    case "documentation_claim":
      return ["documentation"];
    case "readiness_claim":
      return ["runtime_validator"];
    case "candidate_readiness_claim":
      return ["static_validator"];
    case "deployment_readiness_claim":
      return ["deployment_dry_run", "credentialed_deployment_readiness"];
    case "live_deployment_claim":
      return ["live_deployment_execution"];
    case "self_upgrade_claim":
      return ["self_upgrade_safety_contract"];
    default:
      return ["documentation"];
  }
}

export function normalizeEvidenceRefs(entry: ProofLedgerEntry): ProofEvidenceRef[] {
  return (entry.evidence || []).map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `legacy_${index}`,
        evidenceClass: "documentation",
        source: "manual",
        summary: item,
      };
    }

    return item;
  });
}

function hasSelfUpgradeMetadata(entry: ProofLedgerEntry): boolean {
  const metadata = entry.selfUpgradeSafety;
  return !!(
    metadata &&
    (metadata.mode ||
      typeof metadata.targetMainBlocked === "boolean" ||
      typeof metadata.regressionMetadataFromCommandEvidence === "boolean" ||
      typeof metadata.driftChecksEnabled === "boolean")
  );
}

function evidenceNeedsCapturedAt(evidenceClass: ProofEvidenceClass): boolean {
  return ["static_validator", "runtime_validator", "self_upgrade_safety_contract"].includes(evidenceClass);
}

export function verifyClaim(
  entry: ProofLedgerEntry,
  options?: { maxEvidenceAgeMs?: number; now?: string | Date },
): ProofClaimVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!entry.claim.trim()) errors.push("Claim text is missing.");
  if (!entry.validatorSummary.trim()) errors.push("Validator summary is missing.");
  if (!entry.rollbackPlan.trim()) errors.push("Rollback plan is missing.");

  const claimType = classifyClaimType(entry);
  const requiredEvidenceClasses = requiredEvidenceClassesForClaim(claimType);
  const evidenceRefs = normalizeEvidenceRefs(entry);
  const suppliedEvidenceClasses = [...new Set(evidenceRefs.map((e) => e.evidenceClass))];

  if (!evidenceRefs.length) {
    errors.push("Evidence references are missing.");
  }

  const isDeploymentReadiness = claimType === "deployment_readiness_claim";
  const hasAnyRequired = requiredEvidenceClasses.some((requiredClass) =>
    suppliedEvidenceClasses.includes(requiredClass),
  );

  if (!hasAnyRequired && !(claimType === "self_upgrade_claim" && hasSelfUpgradeMetadata(entry))) {
    errors.push(`Required evidence class missing for claim type '${claimType}'.`);
  }

  const now = parseNow(options?.now);
  if (options?.maxEvidenceAgeMs != null) {
    evidenceRefs.forEach((ref) => {
      if (!ref.capturedAt) return;
      const capturedAt = new Date(ref.capturedAt);
      if (Number.isNaN(capturedAt.getTime())) {
        errors.push(`Evidence '${ref.id}' has invalid capturedAt timestamp.`);
        return;
      }
      if (now.getTime() - capturedAt.getTime() > options.maxEvidenceAgeMs!) {
        errors.push(`Evidence '${ref.id}' is stale.`);
      }
    });
  }

  evidenceRefs.forEach((ref) => {
    if (typeof ref.id !== "string" || !ref.id.trim()) {
      errors.push("Evidence reference id is missing.");
    }
    if (evidenceNeedsCapturedAt(ref.evidenceClass) && !ref.capturedAt) {
      errors.push(`Evidence '${ref.id}' missing capturedAt for class '${ref.evidenceClass}'.`);
    }
    if (ref.evidenceClass === "documentation" && ref.id.startsWith("legacy_")) {
      warnings.push("Legacy string evidence accepted as low-confidence documentation evidence.");
    }
  });

  if (isDeploymentReadiness && !hasAnyRequired) {
    errors.push("Deployment readiness claim requires deployment_dry_run or credentialed_deployment_readiness evidence.");
  }

  if (claimType === "live_deployment_claim" && !suppliedEvidenceClasses.includes("live_deployment_execution")) {
    errors.push("Live deployment claim requires live_deployment_execution evidence.");
  }

  if (
    claimType === "self_upgrade_claim" &&
    !suppliedEvidenceClasses.includes("self_upgrade_safety_contract") &&
    !hasSelfUpgradeMetadata(entry)
  ) {
    errors.push("Self-upgrade claim requires self_upgrade_safety_contract evidence or explicit SELF-001 metadata.");
  }

  const recordValid = errors.length === 0;
  const readinessEligible =
    entry.outcome === "passed" &&
    recordValid &&
    evidenceRefs.length > 0 &&
    (claimType !== "deployment_readiness_claim" || hasAnyRequired);

  return {
    recordValid,
    readinessEligible,
    errors,
    warnings,
    requiredEvidenceClasses,
    suppliedEvidenceClasses,
    claimType,
    outcome: entry.outcome,
    freshness: { maxEvidenceAgeMs: options?.maxEvidenceAgeMs, now: options?.now },
  };
}

export function isProofRecordValid(input: ProofClaimVerificationResult | ProofLedgerEntry): boolean {
  if ("recordValid" in input) {
    return input.recordValid;
  }
  return verifyClaim(input).recordValid;
}
