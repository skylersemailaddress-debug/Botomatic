create table if not exists runtime_jobs (
  id text primary key,
  tenant_id text not null,
  project_id text not null,
  build_contract_id text not null,
  state text not null,
  attempt integer not null default 0,
  max_attempts integer not null default 3,
  trace_id text not null,
  payload_json jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists runtime_jobs_state_idx on runtime_jobs (state);
create index if not exists runtime_jobs_trace_idx on runtime_jobs (trace_id);
create index if not exists runtime_jobs_project_idx on runtime_jobs (tenant_id, project_id);

create table if not exists runtime_checkpoints (
  id text primary key,
  job_id text not null references runtime_jobs(id) on delete cascade,
  tenant_id text not null,
  project_id text not null,
  trace_id text not null,
  state text not null,
  sequence integer not null,
  payload_json jsonb not null,
  created_at timestamptz not null
);

create index if not exists runtime_checkpoints_job_idx on runtime_checkpoints (job_id, sequence);
create index if not exists runtime_checkpoints_trace_idx on runtime_checkpoints (trace_id);

create table if not exists runtime_validator_results (
  id bigserial primary key,
  validator_id text not null,
  job_id text not null references runtime_jobs(id) on delete cascade,
  tenant_id text not null,
  project_id text not null,
  trace_id text not null,
  status text not null,
  payload_json jsonb not null,
  created_at timestamptz not null
);

create index if not exists runtime_validator_results_job_idx on runtime_validator_results (job_id, created_at);
create index if not exists runtime_validator_results_trace_idx on runtime_validator_results (trace_id);

create table if not exists runtime_heartbeats (
  id bigserial primary key,
  job_id text not null references runtime_jobs(id) on delete cascade,
  worker_id text not null,
  trace_id text not null,
  tenant_id text not null,
  project_id text not null,
  sequence integer not null,
  created_at timestamptz not null
);

create index if not exists runtime_heartbeats_job_idx on runtime_heartbeats (job_id, sequence);
create index if not exists runtime_heartbeats_worker_idx on runtime_heartbeats (worker_id, created_at);

create table if not exists runtime_cancellations (
  job_id text primary key references runtime_jobs(id) on delete cascade,
  trace_id text not null,
  tenant_id text not null,
  project_id text not null,
  reason text not null,
  requested_at timestamptz not null
);

create index if not exists runtime_cancellations_job_idx on runtime_cancellations (job_id);
