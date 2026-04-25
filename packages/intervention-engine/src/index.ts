export type Intervention = {
  id: string;
  trigger: string;
  action: string;
  expectedImpact: string;
};

export function planInterventions(input: { blockers: string[]; risks: string[] }): Intervention[] {
  const actions = [...input.blockers, ...input.risks].slice(0, 10);
  return actions.map((item, idx) => ({
    id: `intervention_${idx + 1}`,
    trigger: item,
    action: `Mitigate: ${item}`,
    expectedImpact: "Reduced launch and execution risk",
  }));
}
