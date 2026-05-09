export interface RuntimeFeatureFlags {
  runtimeSpineEnabled: boolean;
  sandboxExecutionEnabled: boolean;
  deploymentExecutionEnabled: boolean;
  autoscalingEnabled: boolean;
  observabilityExportEnabled: boolean;
}

export function createDefaultRuntimeFeatureFlags(): RuntimeFeatureFlags {
  return {
    runtimeSpineEnabled: false,
    sandboxExecutionEnabled: false,
    deploymentExecutionEnabled: false,
    autoscalingEnabled: false,
    observabilityExportEnabled: false,
  };
}

export function assertRuntimeFeatureEnabled(enabled: boolean, feature: string): void {
  if (!enabled) {
    throw new Error(`Runtime feature disabled: ${feature}`);
  }
}
