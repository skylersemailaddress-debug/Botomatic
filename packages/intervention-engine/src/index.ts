export type Intervention = {
  id: string;
  trigger: string;
  action: string;
  expectedImpact: string;
  priority: "P0" | "P1" | "P2";
};

function classifyItem(item: string): { action: string; impact: string; priority: "P0" | "P1" | "P2" } {
  const lower = item.toLowerCase();

  if (/auth/.test(lower)) {
    return {
      action: "Implement authentication layer before proceeding",
      impact: "Prevents unauthorized access",
      priority: "P0",
    };
  }
  if (/security|vuln/.test(lower)) {
    return {
      action: "Run security audit and patch vulnerabilities",
      impact: "P0 for commercial release",
      priority: "P0",
    };
  }
  if (/data|database|schema/.test(lower)) {
    return {
      action: "Validate database schema and run migrations",
      impact: "Data integrity at risk",
      priority: "P0",
    };
  }
  if (/placeholder|todo|fixme/.test(lower)) {
    return {
      action: "Replace all placeholder tokens with production implementations",
      impact: "Required for validator pass",
      priority: "P1",
    };
  }
  if (/test|validation/.test(lower)) {
    return {
      action: "Add unit and integration tests for the failing component",
      impact: "Required for proof rung 3",
      priority: "P1",
    };
  }
  if (/build|compile|type/.test(lower)) {
    return {
      action: "Fix TypeScript/build errors before continuing",
      impact: "Blocks execution if unresolved",
      priority: "P1",
    };
  }
  if (/deploy/.test(lower)) {
    return {
      action: "Configure deployment pipeline and environment variables",
      impact: "Required for launch",
      priority: "P2",
    };
  }

  return {
    action: `Resolve blocker: ${item}`,
    impact: "Required for build progression",
    priority: "P2",
  };
}

export function planInterventions(input: { blockers: string[]; risks: string[] }): Intervention[] {
  const actions = [...input.blockers, ...input.risks].slice(0, 10);
  return actions.map((item, idx) => {
    const { action, impact, priority } = classifyItem(item);
    return {
      id: `intervention_${idx + 1}`,
      trigger: item,
      action,
      expectedImpact: impact,
      priority,
    };
  });
}
