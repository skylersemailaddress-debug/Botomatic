import { Blueprint } from "./registry";

export function mergeBlueprints(blueprints: Blueprint[]) {
  const merged = {
    entities: new Set<string>(),
    workflows: new Set<string>(),
    modules: new Set<string>(),
  };

  for (const bp of blueprints) {
    bp.requiredEntities.forEach(e => merged.entities.add(e));
    bp.requiredWorkflows.forEach(w => merged.workflows.add(w));
    bp.modules.forEach(m => merged.modules.add(m));
  }

  return {
    entities: Array.from(merged.entities),
    workflows: Array.from(merged.workflows),
    modules: Array.from(merged.modules),
  };
}
