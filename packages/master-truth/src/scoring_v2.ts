import { MasterTruthV2 } from "./schema";

export function computeConfidenceV2(fields: MasterTruthV2): number {
  let score = 0;

  if (fields.productIntent) score += 0.15;
  if (fields.users.length) score += 0.15;
  if (fields.roles.length) score += 0.1;
  if (fields.entities.length) score += 0.2;
  if (fields.workflows.length) score += 0.15;
  if (fields.integrations.length) score += 0.1;
  if (fields.constraints.length) score += 0.05;
  if (fields.assumptions.length < 3) score += 0.1;

  return Math.min(1, score);
}
