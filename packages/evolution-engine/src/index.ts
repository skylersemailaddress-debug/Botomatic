export type EvolutionProposal = {
  id: string;
  targetSubsystem: string;
  upgradeIntent: string;
  safetyChecks: string[];
  estimatedEffort: "hours" | "days" | "weeks";
  priority: "P0" | "P1" | "P2";
};

function classifyGap(gap: string): {
  upgradeIntent: string;
  safetyChecks: string[];
  estimatedEffort: "hours" | "days" | "weeks";
  priority: "P0" | "P1" | "P2";
} {
  const lower = gap.toLowerCase();

  if (lower === "spec_build_contract" || /spec.*build|build.*contract/.test(lower)) {
    return {
      upgradeIntent: "Resolve all spec blockers and re-generate build contract",
      safetyChecks: [
        "re-run spec analysis",
        "validate all open questions answered",
        "confirm readiness score ≥ 80",
      ],
      estimatedEffort: "days",
      priority: "P1",
    };
  }

  if (lower === "risk_controls" || /risk.*control|control.*risk/.test(lower)) {
    return {
      upgradeIntent: "Add risk mitigation gates before execution",
      safetyChecks: [
        "add pre-execution risk check",
        "validate risky assumptions are addressed",
        "require human approval for high-risk packets",
      ],
      estimatedEffort: "days",
      priority: "P1",
    };
  }

  if (/validation/.test(lower)) {
    return {
      upgradeIntent: "Strengthen validation pipeline",
      safetyChecks: [
        "add missing validators",
        "run full validation suite",
        "capture proof artifacts",
      ],
      estimatedEffort: "hours",
      priority: "P1",
    };
  }

  if (/deployment/.test(lower)) {
    return {
      upgradeIntent: "Harden deployment pipeline",
      safetyChecks: [
        "verify environment variables",
        "test rollback procedure",
        "validate deploy gate passes",
      ],
      estimatedEffort: "days",
      priority: "P2",
    };
  }

  if (/auth|security/.test(lower)) {
    return {
      upgradeIntent: "Upgrade authentication and authorization layer",
      safetyChecks: [
        "audit all auth paths",
        "verify no anonymous access to protected resources",
        "rotate any leaked credentials",
      ],
      estimatedEffort: "days",
      priority: "P0",
    };
  }

  return {
    upgradeIntent: `Upgrade subsystem: ${gap}`,
    safetyChecks: [
      "run regression validators",
      "verify no governance bypass",
      "record proof artifact",
    ],
    estimatedEffort: "weeks",
    priority: "P2",
  };
}

export function proposeEvolution(input: { subsystemGaps: string[] }): EvolutionProposal[] {
  return input.subsystemGaps.map((gap, idx) => {
    const { upgradeIntent, safetyChecks, estimatedEffort, priority } = classifyGap(gap);
    return {
      id: `evolution_${idx + 1}`,
      targetSubsystem: gap,
      upgradeIntent,
      safetyChecks,
      estimatedEffort,
      priority,
    };
  });
}
