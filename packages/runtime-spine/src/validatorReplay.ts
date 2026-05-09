import type { RuntimeCheckpointStore } from './checkpoints.js';
import type { RuntimeValidatorEngine } from './validatorRuntime.js';
import type { RuntimeValidatorResult } from './types.js';

export interface ValidatorReplayDependencies {
  checkpoints: RuntimeCheckpointStore;
  validators: RuntimeValidatorEngine;
}

export function createValidatorReplayOrchestrator(deps: ValidatorReplayDependencies) {
  return {
    async replay(jobId: string, validatorResult: RuntimeValidatorResult) {
      const checkpoint = await deps.checkpoints.loadCheckpoint(jobId);

      if (!checkpoint) {
        throw new Error(`No checkpoint found for runtime replay: ${jobId}`);
      }

      const validated = await deps.validators.validate(validatorResult);

      return {
        checkpoint,
        validator: validated,
        replayedAt: new Date().toISOString(),
      };
    },
  };
}
