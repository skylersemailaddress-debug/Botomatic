export type SelfUpgradeSpec = {
  id: string;
  request: string;
  objective: string;
  affectedModules: string[];
  targetedValidators: string[];
  regressionValidators: string[];
  rollbackInstructions: string[];
  requiresHumanApproval: boolean;
  createdAt: string;
};

export function createSelfUpgradeSpec(input: {
  request: string;
  objective: string;
  affectedModules: string[];
  targetedValidators: string[];
  regressionValidators: string[];
  rollbackInstructions: string[];
}): SelfUpgradeSpec {
  return {
    id: `su_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    request: input.request,
    objective: input.objective,
    affectedModules: input.affectedModules,
    targetedValidators: input.targetedValidators,
    regressionValidators: input.regressionValidators,
    rollbackInstructions: input.rollbackInstructions,
    requiresHumanApproval: true,
    createdAt: new Date().toISOString(),
  };
}
