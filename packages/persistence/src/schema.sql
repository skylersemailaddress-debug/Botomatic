create table if not exists checkpoints (
  checkpoint_id text primary key,
  project_id text not null,
  kind text not null,
  summary text not null,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkpoints_project_id_created_at
  on checkpoints(project_id, created_at);
