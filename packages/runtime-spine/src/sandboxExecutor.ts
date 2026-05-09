import type { RuntimeJob } from './types.js';

export interface SandboxExecutionRequest {
  job: RuntimeJob;
  sandboxId: string;
  command: string;
  timeoutMs: number;
  networkPolicy: 'deny-all' | 'allowlist';
  allowedHosts?: string[];
}

export interface SandboxExecutionResult {
  sandboxId: string;
  jobId: string;
  traceId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'BLOCKED';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  artifacts: string[];
  completedAt: string;
}

export interface SandboxExecutor {
  execute(request: SandboxExecutionRequest): Promise<SandboxExecutionResult>;
}

export function createMemorySandboxExecutor(): SandboxExecutor {
  return {
    async execute(request) {
      if (request.networkPolicy !== 'deny-all' && request.allowedHosts?.length === 0) {
        return {
          sandboxId: request.sandboxId,
          jobId: request.job.id,
          traceId: request.job.traceId,
          status: 'BLOCKED',
          stderr: 'allowlist network policy requires allowed hosts',
          artifacts: [],
          completedAt: new Date().toISOString(),
        };
      }

      if (request.timeoutMs <= 0) {
        return {
          sandboxId: request.sandboxId,
          jobId: request.job.id,
          traceId: request.job.traceId,
          status: 'TIMED_OUT',
          stderr: 'sandbox timeout exceeded before execution',
          artifacts: [],
          completedAt: new Date().toISOString(),
        };
      }

      return {
        sandboxId: request.sandboxId,
        jobId: request.job.id,
        traceId: request.job.traceId,
        status: 'SUCCEEDED',
        exitCode: 0,
        stdout: `executed: ${request.command}`,
        artifacts: [],
        completedAt: new Date().toISOString(),
      };
    },
  };
}
