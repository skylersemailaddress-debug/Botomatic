export type CausalNode = {
  id: string;
  label: string;
  type: "driver" | "constraint" | "outcome" | "risk";
};

export type CausalEdge = {
  from: string;
  to: string;
  reason: string;
  strength: number;
};

export type CausalWorldModel = {
  nodes: CausalNode[];
  edges: CausalEdge[];
  riskScore: number;
  summary: string;
};

function getRiskStrength(riskLabel: string): number {
  const lower = riskLabel.toLowerCase();
  if (/auth|security|payment|data loss|compliance/.test(lower)) return 0.9;
  if (/infrastructure|infra|server|network|deploy/.test(lower)) return 0.8;
  if (/ui|ux|design|interface|layout/.test(lower)) return 0.6;
  return 0.7;
}

function getDriverLabel(outcome: string): string {
  const lower = outcome.toLowerCase();
  if (/auth|login|access/.test(lower)) return "Authentication infrastructure";
  if (/payment|billing|checkout/.test(lower)) return "Payment processing layer";
  if (/data|storage|database/.test(lower)) return "Data persistence layer";
  if (/deploy|launch|release/.test(lower)) return "Deployment pipeline";
  if (/api|service|backend/.test(lower)) return "Core API service";
  return "Core enabler";
}

export function buildCausalWorldModel(input: {
  outcomes: string[];
  constraints: string[];
  risks: string[];
}): CausalWorldModel {
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];

  // Add outcome nodes
  input.outcomes.forEach((outcome, idx) => {
    nodes.push({ id: `outcome_${idx}`, label: outcome, type: "outcome" });
  });

  // Add driver nodes for each outcome — key enablers
  input.outcomes.forEach((outcome, idx) => {
    const driverId = `driver_${idx}`;
    nodes.push({
      id: driverId,
      label: getDriverLabel(outcome),
      type: "driver",
    });
    edges.push({
      from: driverId,
      to: `outcome_${idx}`,
      reason: "Driver enables the target outcome",
      strength: 0.85,
    });
  });

  // Add constraint nodes and edges
  input.constraints.forEach((constraint, idx) => {
    nodes.push({ id: `constraint_${idx}`, label: constraint, type: "constraint" });
    // Constraints shape the most relevant outcome (distribute across outcomes)
    const targetIdx = idx % Math.max(input.outcomes.length, 1);
    if (input.outcomes[targetIdx]) {
      edges.push({
        from: `constraint_${idx}`,
        to: `outcome_${targetIdx}`,
        reason: "Constraint shapes feasible outcome space",
        strength: 0.7,
      });
    }
  });

  // Add risk nodes and edges with severity-based strength
  input.risks.forEach((risk, idx) => {
    nodes.push({ id: `risk_${idx}`, label: risk, type: "risk" });
    const targetIdx = idx % Math.max(input.outcomes.length, 1);
    if (input.outcomes[targetIdx]) {
      const strength = getRiskStrength(risk);
      edges.push({
        from: `risk_${idx}`,
        to: `outcome_${targetIdx}`,
        reason: "Risk can degrade outcome quality",
        strength,
      });
    }
  });

  // Calculate overall riskScore
  // Risk edges are weighted 2x, constraint edges 1x, driver edges 0.5x
  let weightedSum = 0;
  let totalWeight = 0;

  edges.forEach((edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    if (!fromNode) return;
    let weight = 1;
    if (fromNode.type === "risk") weight = 2;
    else if (fromNode.type === "driver") weight = 0.5;
    weightedSum += edge.strength * weight;
    totalWeight += weight;
  });

  const riskScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  // Generate summary
  const outcomeCount = input.outcomes.length;
  const riskCount = input.risks.length;
  const constraintCount = input.constraints.length;
  const riskLevel = riskScore >= 0.8 ? "high" : riskScore >= 0.65 ? "medium" : "low";
  const summary = `${outcomeCount} outcome(s), ${riskCount} risk(s), ${constraintCount} constraint(s) — overall risk: ${riskLevel}`;

  return { nodes, edges, riskScore, summary };
}
