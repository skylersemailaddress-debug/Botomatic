import type { RuntimeCheckpoint, RuntimeJob, RuntimeValidatorResult } from './types.js';
import type { RuntimeStorageAdapter } from './storage.js';

export interface RuntimePostgresClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export function createPostgresRuntimeStorage(client: RuntimePostgresClient): RuntimeStorageAdapter {
  return {
    async saveJob(job: RuntimeJob) {
      await client.query(
        'insert into runtime_jobs (id, tenant_id, project_id, build_contract_id, state, attempt, max_attempts, trace_id, payload, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict (id) do update set state = excluded.state, attempt = excluded.attempt, payload = excluded.payload, updated_at = excluded.updated_at',
        [job.id, job.tenantId, job.projectId, job.buildContractId, job.state, job.attempt, job.maxAttempts, job.traceId, JSON.stringify(job), job.createdAt, job.updatedAt],
      );
    },

    async loadJob(jobId: string) {
      const result = await client.query<{ payload: string }>('select payload from runtime_jobs where id = $1 limit 1', [jobId]);
      const row = result.rows[0];
      return row ? (JSON.parse(row.payload) as RuntimeJob) : null;
    },

    async saveCheckpoint(checkpoint: RuntimeCheckpoint) {
      await client.query(
        'insert into runtime_checkpoints (id, job_id, tenant_id, project_id, trace_id, state, sequence, payload, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [checkpoint.id, checkpoint.jobId, checkpoint.tenantId, checkpoint.projectId, checkpoint.traceId, checkpoint.state, checkpoint.sequence, JSON.stringify(checkpoint), checkpoint.createdAt],
      );
    },

    async listCheckpoints(jobId: string) {
      const result = await client.query<{ payload: string }>('select payload from runtime_checkpoints where job_id = $1 order by sequence asc', [jobId]);
      return result.rows.map((row) => JSON.parse(row.payload) as RuntimeCheckpoint);
    },

    async saveValidatorResult(result: RuntimeValidatorResult) {
      await client.query(
        'insert into runtime_validator_results (validator_id, job_id, tenant_id, project_id, trace_id, status, payload, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
        [result.validatorId, result.jobId, result.tenantId, result.projectId, result.traceId, result.status, JSON.stringify(result), result.createdAt],
      );
    },

    async listValidatorResults(jobId: string) {
      const result = await client.query<{ payload: string }>('select payload from runtime_validator_results where job_id = $1 order by created_at asc', [jobId]);
      return result.rows.map((row) => JSON.parse(row.payload) as RuntimeValidatorResult);
    },
  };
}
