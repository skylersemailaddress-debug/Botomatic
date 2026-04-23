import { ModelCapability, findModelsByCapability } from "./modelRegistry";

export type FallbackRoute = {
  primaryModelId: string;
  fallbackModelIds: string[];
  strategy: "cost_first" | "latency_first";
};

export function buildFallbackRoute(input: {
  capability: ModelCapability;
  preferLowCost?: boolean;
}): FallbackRoute {
  const candidates = findModelsByCapability(input.capability);

  if (candidates.length === 0) {
    throw new Error(`No model candidates for capability: ${input.capability}`);
  }

  const costRank = { low: 1, medium: 2, high: 3 };
  const sorted = [...candidates].sort((a, b) => {
    if (input.preferLowCost) {
      return costRank[a.costTier] - costRank[b.costTier] || a.latencyMs - b.latencyMs;
    }
    return a.latencyMs - b.latencyMs || costRank[a.costTier] - costRank[b.costTier];
  });

  return {
    primaryModelId: sorted[0].id,
    fallbackModelIds: sorted.slice(1).map((m) => m.id),
    strategy: input.preferLowCost ? "cost_first" : "latency_first",
  };
}
