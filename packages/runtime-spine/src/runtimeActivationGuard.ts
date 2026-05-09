import { assertRuntimeFeatureEnabled, type RuntimeFeatureFlags } from './runtimeFeatureFlags.js';

export interface RuntimeActivationRequest {
  feature: keyof RuntimeFeatureFlags;
}

export function assertRuntimeActivationAllowed(
  flags: RuntimeFeatureFlags,
  request: RuntimeActivationRequest,
): void {
  const enabled = flags[request.feature];

  assertRuntimeFeatureEnabled(Boolean(enabled), request.feature);
}
