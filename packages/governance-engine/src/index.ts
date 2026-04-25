export type GovernanceRule = {
  id: string;
  name: string;
  requiredRole: "operator" | "reviewer" | "admin";
  guardrail: string;
};

export function defaultGovernanceRules(): GovernanceRule[] {
  return [
    {
      id: "gov_1",
      name: "Approval before launch",
      requiredRole: "admin",
      guardrail: "No production promotion without governance approval and proof artifacts.",
    },
    {
      id: "gov_2",
      name: "Spec contract enforcement",
      requiredRole: "reviewer",
      guardrail: "No execution when build contract is unresolved.",
    },
    {
      id: "gov_3",
      name: "Repair replay restrictions",
      requiredRole: "admin",
      guardrail: "No replay in unsafe state.",
    },
  ];
}
