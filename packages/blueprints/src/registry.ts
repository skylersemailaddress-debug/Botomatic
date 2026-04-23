export type Blueprint = {
  id: string;
  name: string;
  description: string;
  requiredEntities: string[];
  requiredWorkflows: string[];
  modules: string[];
};

const registry: Blueprint[] = [];

export function registerBlueprint(bp: Blueprint) {
  registry.push(bp);
}

export function getBlueprints(): Blueprint[] {
  return registry;
}
