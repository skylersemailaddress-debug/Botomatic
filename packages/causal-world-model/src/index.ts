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
};

export function buildCausalWorldModel(input: {
  outcomes: string[];
  constraints: string[];
  risks: string[];
}): CausalWorldModel {
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];

  input.outcomes.forEach((outcome, idx) => {
    nodes.push({ id: `outcome_${idx}`, label: outcome, type: "outcome" });
  });
  input.constraints.forEach((constraint, idx) => {
    nodes.push({ id: `constraint_${idx}`, label: constraint, type: "constraint" });
    if (input.outcomes[0]) {
      edges.push({ from: `constraint_${idx}`, to: "outcome_0", reason: "Constraint shapes feasible outcome", strength: 0.7 });
    }
  });
  input.risks.forEach((risk, idx) => {
    nodes.push({ id: `risk_${idx}`, label: risk, type: "risk" });
    if (input.outcomes[0]) {
      edges.push({ from: `risk_${idx}`, to: "outcome_0", reason: "Risk can degrade outcome quality", strength: 0.8 });
    }
  });

  return { nodes, edges };
}
