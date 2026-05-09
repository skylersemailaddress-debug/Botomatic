import type { RuntimeValidatorResult } from './types.js';

export interface RuntimeValidatorEngine {
  validate(result: RuntimeValidatorResult): Promise<RuntimeValidatorResult>;
  approve(params: Omit<RuntimeValidatorResult, 'status' | 'reasons' | 'createdAt'>): Promise<RuntimeValidatorResult>;
  block(params: Omit<RuntimeValidatorResult, 'status' | 'createdAt'>): Promise<RuntimeValidatorResult>;
}

export function createRuntimeValidatorEngine(): RuntimeValidatorEngine {
  return {
    async validate(result) {
      if (result.status === 'BLOCKED' && result.reasons.length === 0) {
        throw new Error('Blocked validator results require at least one reason');
      }

      return result;
    },

    async approve(params) {
      return {
        ...params,
        status: 'APPROVED',
        reasons: [],
        createdAt: new Date().toISOString(),
      };
    },

    async block(params) {
      if (params.reasons.length === 0) {
        throw new Error('Blocked validator results require at least one reason');
      }

      return {
        ...params,
        status: 'BLOCKED',
        createdAt: new Date().toISOString(),
      };
    },
  };
}
