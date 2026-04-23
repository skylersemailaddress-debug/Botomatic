export function computeConfidence(fields: any): number {
  let score = 0;

  if (fields.productIntent) score += 0.2;
  if (fields.users.length) score += 0.2;
  if (fields.entities.length) score += 0.2;
  if (fields.workflows.length) score += 0.2;
  if (fields.integrations.length) score += 0.2;

  return Math.min(1, score);
}
