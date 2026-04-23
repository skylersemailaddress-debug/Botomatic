import { seedCoreBlueprints } from "./library";
import { matchBlueprints } from "./matcher";
import { mergeBlueprints } from "./merger";

export function planFromBlueprints(input: {
  entities: string[];
  workflows: string[];
}) {
  seedCoreBlueprints();
  const matched = matchBlueprints({
    entities: input.entities,
    workflows: input.workflows,
  });

  if (matched.length === 0) {
    return {
      blueprintIds: [],
      entities: input.entities,
      workflows: input.workflows,
      modules: ["rbac", "audit"],
      fallback: true,
    };
  }

  const merged = mergeBlueprints(matched);

  return {
    blueprintIds: matched.map((bp) => bp.id),
    entities: merged.entities,
    workflows: merged.workflows,
    modules: merged.modules,
    fallback: false,
  };
}
