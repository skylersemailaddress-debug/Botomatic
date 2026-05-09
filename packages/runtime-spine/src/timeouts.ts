import type { RuntimeJob } from './types.js';

export interface RuntimeTimeoutPolicy {
  maxExecutionMs: number;
  maxHeartbeatSilenceMs: number;
}

export interface RuntimeTimeoutEvaluation {
  jobId: string;
  traceId: string;
  timedOut: boolean;
  reason?: string;
  evaluatedAt: string;
}

export function evaluateRuntimeTimeout(params: {
  job: RuntimeJob;
  startedAt: Date;
  now?: Date;
  policy: RuntimeTimeoutPolicy;
  lastHeartbeatAt?: Date;
}): RuntimeTimeoutEvaluation {
  const now = params.now ?? new Date();

  const executionMs = now.getTime() - params.startedAt.getTime();

  if (executionMs >= params.policy.maxExecutionMs) {
    return {
      jobId: params.job.id,
      traceId: params.job.traceId,
      timedOut: true,
      reason: 'max-execution-time-exceeded',
      evaluatedAt: now.toISOString(),
    };
  }

  if (params.lastHeartbeatAt) {
    const silenceMs = now.getTime() - params.lastHeartbeatAt.getTime();

    if (silenceMs >= params.policy.maxHeartbeatSilenceMs) {
      return {
        jobId: params.job.id,
        traceId: params.job.traceId,
        timedOut: true,
        reason: 'heartbeat-silence-timeout',
        evaluatedAt: now.toISOString(),
      };
    }
  }

  return {
    jobId: params.job.id,
    traceId: params.job.traceId,
    timedOut: false,
    evaluatedAt: now.toISOString(),
  };
}
