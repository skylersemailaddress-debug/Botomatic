import { Blueprint, getBlueprints } from "./registry";

export function matchBlueprints(input: {
  entities: string[];
  workflows: string[];
}): Blueprint[] {
  const all = getBlueprints();

  return all.filter((bp) => {
    const entityMatch = bp.requiredEntities.every((e) => input.entities.includes(e));
    const workflowMatch = bp.requiredWorkflows.every((w) => input.workflows.includes(w));
    return entityMatch && workflowMatch;
  });
}
