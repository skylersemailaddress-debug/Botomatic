export type BlockerCategory =
  | "user-decision"
  | "build-contract-gap"
  | "generated-app-failure"
  | "builder-defect"
  | "unknown";

export type CategorizedBlocker = {
  text: string;
  category: BlockerCategory;
  recommendedCommand: string;
};

export type SystemIntelligence = {
  currentState: string;
  nextBestAction: string;
  why: string;
  safeDefault: string;
  blockers: CategorizedBlocker[];
  suggestedCommand: string;
};

function categoryFromText(text: string): BlockerCategory {
  const normalized = text.toLowerCase();

  if (/(missing_human_decision|missing_secret_or_credential)/.test(normalized)) {
    return "user-decision";
  }
  if (/build_contract_ambiguity/.test(normalized)) {
    return "build-contract-gap";
  }
  if (/(generated_app_implementation_failure|validation_contract_failure|resource_limit_failure|external_provider_unavailable)/.test(normalized)) {
    return "generated-app-failure";
  }
  if (/botomatic_builder_defect/.test(normalized)) {
    return "builder-defect";
  }

  if (/(approve|approval|required decision|choose|consent|legal|compliance|security decision)/.test(normalized)) {
    return "user-decision";
  }
  if (/(spec|contract|missing requirement|clarification|assumption|acceptance criteria)/.test(normalized)) {
    return "build-contract-gap";
  }
  if (/(build failed|compile|test failed|runtime error|generated app|artifact error|deploy failed)/.test(normalized)) {
    return "generated-app-failure";
  }
  if (/(internal error|orchestrator|builder defect|pipeline defect|unhandled)/.test(normalized)) {
    return "builder-defect";
  }
  return "unknown";
}

function commandForCategory(category: BlockerCategory): string {
  if (category === "user-decision") return "resolve blocker";
  if (category === "build-contract-gap") return "generate plan";
  if (category === "generated-app-failure") return "fix failure";
  if (category === "builder-defect") return "inspect failure";
  return "explain blocker";
}

export function categorizeBlockers(blockers: string[]): CategorizedBlocker[] {
  return blockers
    .filter(Boolean)
    .map((text) => {
      const category = categoryFromText(text);
      return {
        text,
        category,
        recommendedCommand: commandForCategory(category),
      };
    });
}

export function classifyError(errorMessage: string): {
  className: "permission" | "validation" | "network" | "generated-app-failure" | "builder-defect";
  recommendedCommand: string;
} {
  const message = errorMessage.toLowerCase();

  if (/(401|403|forbidden|unauthorized|permission|credential|secret)/.test(message)) {
    return { className: "permission", recommendedCommand: "explain blocker" };
  }
  if (/(validation|invalid|schema|parse|manifest)/.test(message)) {
    return { className: "validation", recommendedCommand: "fix failure" };
  }
  if (/(network|timeout|econn|failed to fetch|connection|unavailable)/.test(message)) {
    return { className: "network", recommendedCommand: "continue build" };
  }
  if (/(compile|test failed|runtime|artifact|generated app)/.test(message)) {
    return { className: "generated-app-failure", recommendedCommand: "inspect failure" };
  }
  return { className: "builder-defect", recommendedCommand: "inspect failure" };
}

export function buildSystemIntelligence(input: {
  runStatus: string;
  readinessStatus: string;
  blockerTexts: string[];
  currentMilestone?: string;
  runId?: string;
}): SystemIntelligence {
  const blockers = categorizeBlockers(input.blockerTexts);
  const stateParts = [
    `run=${input.runStatus || "idle"}`,
    `readiness=${input.readinessStatus || "unknown"}`,
  ];
  if (input.runId) stateParts.push(`runId=${input.runId}`);
  if (input.currentMilestone) stateParts.push(`milestone=${input.currentMilestone}`);

  if (blockers.length > 0) {
    const top = blockers[0];
    return {
      currentState: stateParts.join(" | "),
      nextBestAction: top.recommendedCommand,
      why: `Top blocker is classified as ${top.category}.`,
      safeDefault: "Continue with safe defaults and keep live deployment blocked until explicit approval.",
      blockers,
      suggestedCommand: top.recommendedCommand,
    };
  }

  if (input.runStatus === "executing" || input.runStatus === "running") {
    return {
      currentState: stateParts.join(" | "),
      nextBestAction: "continue build",
      why: "Execution is active and autonomy can proceed without new inputs.",
      safeDefault: "Continue autonomously with safe defaults.",
      blockers,
      suggestedCommand: "continue build",
    };
  }

  if (input.readinessStatus === "not_started") {
    return {
      currentState: stateParts.join(" | "),
      nextBestAction: "validate",
      why: "Validation has not run, so launch readiness is unknown.",
      safeDefault: "Run validation before deployment or promotion decisions.",
      blockers,
      suggestedCommand: "validate",
    };
  }

  return {
    currentState: stateParts.join(" | "),
    nextBestAction: "generate plan",
    why: "Planning establishes milestones and reduces ambiguity before execution.",
    safeDefault: "Generate a plan and approve defaults for non-sensitive decisions.",
    blockers,
    suggestedCommand: "generate plan",
  };
}
