-- ── orchestrator_projects ───────────────────────────────────────────────────
create table if not exists orchestrator_projects (
  project_id          text primary key,
  owner_user_id       text not null,
  tenant_id           text not null,
  name                text not null,
  request             text not null,
  status              text not null,
  master_truth        jsonb,
  plan                jsonb,
  runs                jsonb,
  validations         jsonb,
  git_operations      jsonb,
  git_results         jsonb,
  audit_events        jsonb,
  governance_approval jsonb,
  blueprint           text,
  approval_mode       text,
  github_owner        text,
  github_repo         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_orchestrator_projects_status on orchestrator_projects(status);
create index if not exists idx_orchestrator_projects_owner on orchestrator_projects(owner_user_id, project_id);
create index if not exists idx_orchestrator_projects_tenant on orchestrator_projects(tenant_id, project_id);
create index if not exists idx_orchestrator_projects_updated on orchestrator_projects(updated_at desc);

create table if not exists orchestrator_jobs (
  job_id           text primary key,
  project_id       text not null references orchestrator_projects(project_id) on delete cascade,
  owner_user_id    text not null,
  tenant_id        text not null,
  packet_id        text not null,
  type             text not null default 'execute_packet',
  status           text not null default 'queued',
  worker_id        text,
  lease_expires_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_jobs_status on orchestrator_jobs(status);
create index if not exists idx_jobs_project on orchestrator_jobs(project_id);
create index if not exists idx_jobs_owner_project on orchestrator_jobs(owner_user_id, project_id);

create or replace function claim_job(worker_id text, lease_ms bigint)
returns setof orchestrator_jobs
language plpgsql
as $$
declare
  claimed orchestrator_jobs;
begin
  select * into claimed
  from orchestrator_jobs
  where status = 'queued'
     or (status = 'running' and lease_expires_at < now())
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update orchestrator_jobs
  set status           = 'running',
      worker_id        = claim_job.worker_id,
      lease_expires_at = now() + (lease_ms || ' milliseconds')::interval,
      updated_at       = now()
  where job_id = claimed.job_id
  returning * into claimed;

  return next claimed;
end;
$$;
