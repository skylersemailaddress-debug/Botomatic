import { buildFallbackRoute } from "./fallbackRouter";
import { evaluateModelOutputConfidence } from "./confidenceRouter";
import { recordModelExecutionTrace } from "./executionTrace";

export type RoutedExecutionResultV2<T> = {
  result: T;
  modelId: string;
  attempts: string[];
  confidence: number;
};

export async function executeWithModelFallbackV2<T>(input: {
  capability: "extract" | "plan" | "code" | "review" | "validate";
  preferLowCost?: boolean;
  threshold?: number;
  invoke: (modelId: string) => Promise<{ result: T; confidence: number }>;
}): Promise<RoutedExecutionResultV2<T>> {
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
      const response = await input.invoke(modelId);
      const decision = evaluateModelOutputConfidence({
        confidence: response.confidence,
        threshold: input.threshold,
      });

      if (decision.accepted) {
        recordModelExecutionTrace({
          capability: input.capability,
          selectedModelId: modelId,
          attemptedModelIds: attempts,
          success: true,
          confidence: response.confidence,
        });

        return {
          result: response.result,
          modelId,
          attempts,
          confidence: response.confidence,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  recordModelExecutionTrace({
    capability: input.capability,
    selectedModelId: ordered[ordered.length - 1],
    attemptedModelIds: attempts,
    success: false,
    confidence: 0,
  });

  throw lastError || new Error("All routed model attempts failed or were below confidence threshold");
}
