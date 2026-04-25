export type CompletionPlanPhase = {
  id: string;
  title: string;
  goals: string[];
};

export function createCompletionPlan(input: { blockers: string[] }): CompletionPlanPhase[] {
  return [
    { id: "p1", title: "Stabilize build and tests", goals: ["Fix install/build/test blockers"] },
    { id: "p2", title: "Replace placeholders and fake flows", goals: ["Remove placeholders", "Implement real integrations"] },
    { id: "p3", title: "Close product/security/deployment gaps", goals: input.blockers.length ? input.blockers : ["Finalize launch checklist"] },
  ];
}
