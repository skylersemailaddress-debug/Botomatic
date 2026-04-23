import { Environment, DeploymentRecord } from "./environment";

export type PromotionDecision = {
  allowed: boolean;
  reason?: string;
};

export function canPromote(input: {
  from: Environment;
  to: Environment;
  approved: boolean;
}): PromotionDecision {
  if (input.from === "preview" && input.to === "staging") {
    return { allowed: true };
  }

  if (input.from === "staging" && input.to === "production") {
    if (!input.approved) {
      return { allowed: false, reason: "Production promotion requires approval" };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: `Invalid promotion path: ${input.from} -> ${input.to}` };
}

export function promoteDeployment(record: DeploymentRecord, to: Environment): DeploymentRecord {
  return {
    ...record,
    environment: to,
    status: "pending",
  };
}
