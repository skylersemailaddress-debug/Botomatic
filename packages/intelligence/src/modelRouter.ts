import { ModelCapability, findModelsByCapability } from "./modelRegistry";

export type RouteDecision = {
  modelId: string;
  reason: string;
};

export function routeModel(input: {
  capability: ModelCapability;
  preferLowCost?: boolean;
}): RouteDecision {
  const candidates = findModelsByCapability(input.capability);

  if (candidates.length === 0) {
    throw new Error(`No model found for capability: ${input.capability}`);
  }

  const sorted = [...candidates].sort((a, b) => {
    if (input.preferLowCost) {
      const costRank = { low: 1, medium: 2, high: 3 };
      return costRank[a.costTier] - costRank[b.costTier];
    }
    return a.latencyMs - b.latencyMs;
  });

  const selected = sorted[0];

  return {
    modelId: selected.id,
    reason: input.preferLowCost
      ? "lowest cost model selected"
      : "lowest latency model selected",
  };
}
