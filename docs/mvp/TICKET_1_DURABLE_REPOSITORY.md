# Ticket 1 — Durable Repository

## Objective
Replace the current in-memory project repository with a durable repository so project state survives API restarts and the orchestrator can honestly support continuity, recovery, and auditability.

## Current blocker
The orchestrator server currently instantiates `InMemoryProjectRepository`, which stores project state in a process-local `Map`. That means all state is lost on restart and the system is not release-ready.

## Scope
This ticket covers:
- a durable `ProjectRepository` implementation
- durable storage for all current `StoredProjectRecord` fields
- runtime selection of durable repository in the orchestrator API
- restart continuity validation

This ticket does not cover:
- API auth
- webhook ingestion
- GitHub reconciliation hardening
- approval model changes
- release evidence redesign

## Existing interfaces
Current interface:

```ts
export interface StoredProjectRecord {
  projectId: string;
  name: string;
  request: string;
  status: string;
  masterTruth?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  runs?: Record<string, unknown> | null;
  validations?: Record<string, unknown> | null;
  gitOperations?: Record<string, unknown> | null;
  gitResults?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepository {
  getProject(projectId: string): Promise<StoredProjectRecord | null>;
  upsertProject(record: StoredProjectRecord): Promise<void>;
}
```

## Target design
Add a durable repository implementation under `packages/supabase-adapter/src/` with the same interface shape so orchestrator logic stays mostly unchanged.

Recommended implementation path:
- `packages/supabase-adapter/src/durableRepo.ts`
- `packages/supabase-adapter/src/client.ts`
- `packages/supabase-adapter/src/schema.sql`

### Storage model
Use one durable table for the current MVP shape.

Recommended table:

```sql
create table if not exists orchestrator_projects (
  project_id text primary key,
  name text not null,
  request text not null,
  status text not null,
  master_truth jsonb null,
  plan jsonb null,
  runs jsonb null,
  validations jsonb null,
  git_operations jsonb null,
  git_results jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Runtime behavior
The orchestrator server should:
- prefer durable repository mode when required env vars are present
- fail fast in production-like environments if durable storage is required but unavailable
- optionally allow in-memory fallback only in local dev/test mode

Suggested envs:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PROJECT_REPOSITORY_MODE=memory|durable`

## Required code changes
1. Add durable repository class implementing `ProjectRepository`
2. Add serialization and deserialization mapping between DB columns and `StoredProjectRecord`
3. Replace direct `new InMemoryProjectRepository()` in `apps/orchestrator-api/src/server.ts` with repository factory logic
4. Preserve current `StoredProjectRecord` contract
5. Keep `InMemoryProjectRepository` for local fallback only

## Acceptance criteria
- `POST /api/projects/intake` writes project state durably
- `POST /api/projects/:projectId/compile` updates the same durable record
- `POST /api/projects/:projectId/plan` updates the same durable record
- `POST /api/projects/:projectId/dispatch/execute-next` updates the same durable record
- `GET /api/projects/:projectId/status` reads from durable storage
- after API restart, previously created project state remains available
- orchestrator can be configured explicitly for `memory` or `durable` mode
- no orchestrator route logic depends on in-memory-only behavior

## Validation plan
### Manual validation
1. Start API in durable mode
2. Create project through `/api/projects/intake`
3. Compile and plan project
4. Restart API process
5. Call `/api/projects/:projectId/status`
6. Confirm full state is preserved

### Required automated coverage
Add tests for:
- durable upsert then fetch roundtrip
- update existing project preserving `createdAt`
- null and JSON field roundtrip fidelity
- repository factory chooses durable mode correctly
- restart continuity simulated by re-instantiating repository and re-reading existing row

## Definition of done
This ticket is done only when the active orchestrator path no longer depends on volatile process memory for project persistence in durable mode.

## Follow-on dependencies
After this ticket lands, proceed to:
- Ticket 2 — API auth
- Ticket 3 — GitHub reconciliation
- Ticket 4 — validation evidence
- Ticket 5 — webhook ingestion
