import { buildFallbackRoute } from "./fallbackRouter";

export type RoutedExecutionResult<T> = {
  result: T;
  modelId: string;
  attempts: string[];
};

export async function executeWithModelFallback<T>(input: {
  capability: "extract" | "plan" | "code" | "review" | "validate";
  preferLowCost?: boolean;
  invoke: (modelId: string) => Promise<T>;
}): Promise<RoutedExecutionResult<T>> {
  const route = buildFallbackRoute({
    capability: input.capability,
    preferLowCost: input.preferLowCost,
  });

  const ordered = [route.primaryModelId, ...route.fallbackModelIds];
  const attempts: string[] = [];
  let lastError: unknown;

  for (const modelId of ordered) {
    try {
      attempts.push(modelId);
      const result = await input.invoke(modelId);
      return {
        result,
        modelId,
        attempts,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
