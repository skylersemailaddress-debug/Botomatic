-- ── Projects table ────────────────────────────────────────────────────────────
create table if not exists projects (
  "projectId"    text primary key,
  name           text not null,
  request        text not null,
  status         text not null,
  "masterTruth"  jsonb,
  plan           jsonb,
  runs           jsonb,
  validations    jsonb,
  "gitOperations" jsonb,
  "gitResults"   jsonb,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

create index if not exists idx_projects_status on projects(status);

-- ── Orchestrator jobs queue ────────────────────────────────────────────────────
create table if not exists orchestrator_jobs (
  id               bigserial primary key,
  job_id           text unique not null,
  project_id       text not null,
  packet_id        text not null,
  type             text not null default 'execute_packet',
  status           text not null default 'queued',
  worker_id        text,
  lease_expires_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_orchestrator_jobs_status
  on orchestrator_jobs(status);

create index if not exists idx_orchestrator_jobs_project
  on orchestrator_jobs(project_id);

-- ── claim_job RPC ──────────────────────────────────────────────────────────────
-- Workers call this to atomically claim the next queued job.
create or replace function claim_job(worker_id text, lease_ms int)
returns setof orchestrator_jobs
language plpgsql
as $$
declare
  claimed orchestrator_jobs;
begin
  select * into claimed
  from orchestrator_jobs
  where status = 'queued'
    and (lease_expires_at is null or lease_expires_at < now())
  order by created_at asc
  limit 1
  for update skip locked;

  if claimed.id is null then
    return;
  end if;

  update orchestrator_jobs
  set
    status           = 'running',
    worker_id        = claim_job.worker_id,
    lease_expires_at = now() + (lease_ms || ' milliseconds')::interval,
    updated_at       = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;
