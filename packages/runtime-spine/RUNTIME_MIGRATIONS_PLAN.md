# Runtime Spine Migration Plan

## Purpose

Define the minimum durable persistence schema required for the runtime spine.

## Required Tables

### runtime_jobs

Tracks orchestration lifecycle state.

Columns:

- id
- tenant_id
- project_id
- build_contract_id
- state
- attempt
- max_attempts
- trace_id
- payload_json
- created_at
- updated_at

Indexes:

- runtime_jobs_state_idx
- runtime_jobs_trace_idx
- runtime_jobs_project_idx

---

### runtime_checkpoints

Tracks orchestration recovery checkpoints.

Columns:

- id
- job_id
- tenant_id
- project_id
- trace_id
- state
- sequence
- payload_json
- created_at

Indexes:

- runtime_checkpoints_job_idx
- runtime_checkpoints_trace_idx

---

### runtime_validator_results

Tracks validator lineage.

Columns:

- validator_id
- job_id
- tenant_id
- project_id
- trace_id
- status
- payload_json
- created_at

Indexes:

- runtime_validator_results_job_idx
- runtime_validator_results_trace_idx

---

### runtime_heartbeats

Tracks worker liveness.

Columns:

- job_id
- worker_id
- trace_id
- tenant_id
- project_id
- sequence
- created_at

Indexes:

- runtime_heartbeats_job_idx
- runtime_heartbeats_worker_idx

---

### runtime_cancellations

Tracks cancellation requests.

Columns:

- job_id
- trace_id
- tenant_id
- project_id
- reason
- requested_at

Indexes:

- runtime_cancellations_job_idx

## Migration Order

1. runtime_jobs
2. runtime_checkpoints
3. runtime_validator_results
4. runtime_heartbeats
5. runtime_cancellations

## Governance Rules

- all mutations are append-safe
- all runtime records remain attributable
- trace lineage must remain queryable
- validator lineage must remain replayable
- checkpoints must remain sequence-ordered
- cancellations must remain auditable

## Exit Criteria

Migration planning exits only when:

- SQL migrations exist
- rollback strategy exists
- migration validation exists
- persistence proof tests exist
