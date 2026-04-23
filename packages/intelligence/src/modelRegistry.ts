export type ModelCapability = "extract" | "plan" | "code" | "review" | "validate";

export type ModelConfig = {
  id: string;
  capabilities: ModelCapability[];
  costTier: "low" | "medium" | "high";
  latencyMs: number;
};

const registry: ModelConfig[] = [];

export function registerModel(model: ModelConfig) {
  registry.push(model);
}

export function getModels(): ModelConfig[] {
  return registry;
}

export function findModelsByCapability(cap: ModelCapability): ModelConfig[] {
  return registry.filter(m => m.capabilities.includes(cap));
}
