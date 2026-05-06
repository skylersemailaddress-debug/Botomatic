-- Friends-and-family beta tenant isolation retrofit.
-- Backfills existing rows to a legacy owner and then makes owner/tenant columns mandatory.
alter table orchestrator_projects add column if not exists owner_user_id text;
alter table orchestrator_projects add column if not exists tenant_id text;
update orchestrator_projects
set owner_user_id = coalesce(owner_user_id, 'legacy:unassigned'),
    tenant_id = coalesce(tenant_id, owner_user_id, 'legacy:unassigned')
where owner_user_id is null or tenant_id is null;
alter table orchestrator_projects alter column owner_user_id set not null;
alter table orchestrator_projects alter column tenant_id set not null;
create index if not exists idx_orchestrator_projects_owner on orchestrator_projects(owner_user_id, project_id);
create index if not exists idx_orchestrator_projects_tenant on orchestrator_projects(tenant_id, project_id);

alter table orchestrator_jobs add column if not exists owner_user_id text;
alter table orchestrator_jobs add column if not exists tenant_id text;
update orchestrator_jobs j
set owner_user_id = coalesce(j.owner_user_id, p.owner_user_id, 'legacy:unassigned'),
    tenant_id = coalesce(j.tenant_id, p.tenant_id, p.owner_user_id, 'legacy:unassigned')
from orchestrator_projects p
where j.project_id = p.project_id and (j.owner_user_id is null or j.tenant_id is null);
update orchestrator_jobs
set owner_user_id = coalesce(owner_user_id, 'legacy:unassigned'),
    tenant_id = coalesce(tenant_id, owner_user_id, 'legacy:unassigned')
where owner_user_id is null or tenant_id is null;
alter table orchestrator_jobs alter column owner_user_id set not null;
alter table orchestrator_jobs alter column tenant_id set not null;
create index if not exists idx_jobs_owner_project on orchestrator_jobs(owner_user_id, project_id);
