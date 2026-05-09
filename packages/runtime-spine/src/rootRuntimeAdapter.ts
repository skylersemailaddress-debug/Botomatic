import { assertRuntimeActivationAllowed } from './runtimeActivationGuard.js';
import type { RuntimeFeatureFlags } from './runtimeFeatureFlags.js';
import type { RuntimeJob } from './types.js';

export interface RootRuntimeAdapterRequest {
  flags: RuntimeFeatureFlags;
  job: RuntimeJob;
}

export interface RootRuntimeAdapterResult {
  accepted: boolean;
  jobId: string;
  traceId: string;
  reason?: string;
}

export function createRootRuntimeAdapter() {
  return {
    async acceptRuntimeJob(request: RootRuntimeAdapterRequest): Promise<RootRuntimeAdapterResult> {
      assertRuntimeActivationAllowed(request.flags, {
        feature: 'runtimeSpineEnabled',
      });

      return {
        accepted: true,
        jobId: request.job.id,
        traceId: request.job.traceId,
      };
    },
  };
}
