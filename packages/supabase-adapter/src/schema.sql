create table if not exists projects (
  projectId text primary key,
  name text not null,
  request text not null,
  status text not null,
  masterTruth jsonb,
  plan jsonb,
  runs jsonb,
  validations jsonb,
  gitOperations jsonb,
  gitResults jsonb,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create index if not exists idx_projects_status on projects(status);
