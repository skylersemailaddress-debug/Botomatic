# Route Authorization Matrix

This matrix is the human-readable view of `apps/orchestrator-api/src/security/routePolicies.ts`. Every live Express API route under `apps/orchestrator-api/src/**` must appear here and in the machine-readable policy config.

## Policy levels

- `public`: no authentication required; only allowed for non-sensitive read-only health checks.
- `authenticated`: requires a verified non-anonymous actor, but is not scoped to an existing project.
- `project_owner`: requires a verified non-anonymous actor and repository-level authorization for the `:projectId`.
- `operator`: requires project authorization plus reviewer/operator-grade runtime role privileges for gated operational surfaces.
- `admin`: requires project authorization plus admin runtime role privileges for release, deployment, and replay controls.
- `system_only`: reserved for non-user automation endpoints; no live route currently uses this beta policy.

## Enforcement

- `server_app.ts` installs the shared `createRoutePolicyMiddleware` helper before route registration so policy checks are centralized.
- Legacy inline guards may remain as defense in depth, but the policy config below is the authoritative minimum policy for beta.
- `npm run validate:route-auth` verifies that live routes, this matrix, and the machine-readable config stay synchronized.

## Matrix

| Route | Policy | Project-scoped | Mutates | Sensitive | Rationale |
| --- | --- | --- | --- | --- | --- |
| GET /health | public | no | no | no | Runtime health check exposes only service metadata and auth status. |
| GET /api/health | public | no | no | no | API health check exposes only service metadata and auth status. |
| GET /ready | public | no | no | no | Runtime readiness check exposes only service metadata and auth status. |
| GET /api/ready | public | no | no | no | API readiness check exposes only service metadata and auth status. |
| GET /registry/capabilities | authenticated | no | no | yes | Capability inventory is beta surface metadata and should not be anonymously enumerable. |
| GET /api/registry/capabilities | authenticated | no | no | yes | Capability inventory is beta surface metadata and should not be anonymously enumerable. |
| GET /api/ops/metrics | operator | no | no | yes | Operational metrics can reveal tenant activity and runtime health. |
| GET /ops/metrics | operator | no | no | yes | Operational metrics can reveal tenant activity and runtime health. |
| GET /api/ops/errors | operator | no | no | yes | Operational errors can contain route, actor, and failure metadata. |
| GET /api/ops/queue | operator | no | no | yes | Queue state can reveal project workload and worker details. |
| GET /admin/projects/:projectId/state | operator | no | no | yes | Support operators can inspect full project state for incident response. |
| GET /admin/build-runs/:buildRunId | operator | no | no | yes | Support operators can inspect build run execution details. |
| GET /admin/job-queue | operator | no | no | yes | Support operators can inspect queue health and job backlog. |
| GET /admin/readiness/:projectId | operator | no | no | yes | Support operators can inspect readiness decisions. |
| POST /admin/jobs/:jobId/replay | operator | no | yes | yes | Support operators can safely replay idempotent jobs. |
| POST /admin/build-runs/:buildRunId/cancel | operator | no | yes | yes | Support operators can cancel stuck builds. |
| GET /admin/projects/:projectId/evidence-bundle | operator | no | no | yes | Support operators can export evidence bundles for incident diagnosis. |
| POST /api/projects/intake | authenticated | no | yes | yes | Creates a tenant-owned project and therefore requires an authenticated actor. |
| GET /api/projects/:projectId/intake/sources | project_owner | yes | no | yes | Lists uploaded and linked project source material. |
| GET /api/projects/:projectId/intake/sources/:sourceId | project_owner | yes | no | yes | Reads project source metadata and extracted context. |
| POST /api/projects/:projectId/intake/source | project_owner | yes | yes | yes | Adds source metadata to a project. |
| POST /api/projects/:projectId/intake/pasted-text | project_owner | yes | yes | yes | Adds pasted source text to a project. |
| POST /api/projects/:projectId/intake/github | project_owner | yes | yes | yes | Imports repository source material into a project. |
| POST /api/projects/:projectId/intake/cloud-link | project_owner | yes | yes | yes | Registers cloud source material for a project. |
| POST /api/projects/:projectId/intake/local-manifest | project_owner | yes | yes | yes | Registers local source manifest metadata for a project. |
| POST /api/projects/:projectId/intake/file | project_owner | yes | yes | yes | Uploads project source files. |
| POST /api/projects/:projectId/spec/analyze | project_owner | yes | yes | yes | Generates and stores project specification analysis. |
| POST /api/projects/:projectId/spec/clarify | project_owner | yes | yes | yes | Updates project specification clarifications. |
| POST /api/projects/:projectId/spec/assumptions/accept | project_owner | yes | yes | yes | Accepts project specification assumptions. |
| POST /api/projects/:projectId/spec/recommendations/apply | project_owner | yes | yes | yes | Applies project specification recommendations. |
| POST /api/projects/:projectId/spec/build-contract | project_owner | yes | yes | yes | Generates a project build contract. |
| POST /api/projects/:projectId/spec/approve | operator | yes | yes | yes | Approves a project specification and advances gated build state. |
| GET /api/projects/:projectId/spec/status | project_owner | yes | no | yes | Reads project specification state. |
| GET /api/projects/:projectId/readiness | project_owner | yes | no | yes | Reads commercial build readiness state and blocking decisions. |
| POST /api/projects/:projectId/clarifications | project_owner | yes | yes | yes | Persists user answers to pre-build decision questions. |
| POST /api/projects/:projectId/self-upgrade/spec | operator | yes | yes | yes | Plans self-upgrade work with repository-level implications. |
| GET /api/projects/:projectId/self-upgrade/status | operator | yes | no | yes | Reads self-upgrade state and drift signals. |
| POST /api/projects/:projectId/repo/completion-contract | operator | yes | yes | yes | Generates repository completion and repair planning state. |
| GET /api/projects/:projectId/repo/status | operator | yes | no | yes | Reads repository audit and completion status. |
| POST /api/projects/:projectId/universal/capability-pipeline | operator | yes | yes | yes | Runs universal capability pipeline planning. |
| GET /api/projects/:projectId/universal/capability-pipeline | operator | yes | no | yes | Reads universal capability pipeline artifacts. |
| POST /api/projects/:projectId/build/start | project_owner | yes | yes | yes | Public build entry point with readiness gate; enforced at Express layer for Railway deployments. |
| POST /api/projects/:projectId/autonomous-build/start | operator | yes | yes | yes | Starts autonomous build execution. |
| GET /api/projects/:projectId/autonomous-build/status | operator | yes | no | yes | Reads autonomous build execution state. |
| POST /api/projects/:projectId/autonomous-build/resume | operator | yes | yes | yes | Resumes autonomous build execution. |
| POST /api/projects/:projectId/autonomous-build/approve-blocker | operator | yes | yes | yes | Approves a blocker in autonomous build execution. |
| POST /api/projects/:projectId/operator/send | project_owner | yes | yes | yes | Sends an operator instruction into the project orchestration loop. |
| POST /api/projects/:projectId/compile | project_owner | yes | yes | yes | Compiles project master truth artifacts. |
| POST /api/projects/:projectId/plan | project_owner | yes | yes | yes | Generates project execution packets. |
| POST /api/projects/:projectId/git/result | operator | yes | yes | yes | Records external git operation results for a project. |
| POST /api/projects/:projectId/dispatch/execute-next | operator | yes | yes | yes | Dispatches project execution work. |
| POST /api/projects/:projectId/repair/replay | admin | yes | yes | yes | Replays repair execution and can modify generated workspace state. |
| GET /api/projects/:projectId/status | project_owner | yes | no | yes | Reads project summary status. |
| GET /api/projects/:projectId/state | project_owner | yes | no | yes | Reads full project orchestration state. |
| GET /api/projects/:projectId/resume | project_owner | yes | no | yes | Reads project resume and next-action guidance. |
| GET /api/projects/:projectId/runtime | project_owner | yes | no | yes | Reads project runtime state. |
| GET /api/projects/:projectId/execution | project_owner | yes | no | yes | Reads project execution run list. |
| GET /api/projects/:projectId/execution/:runId | project_owner | yes | no | yes | Reads a project execution run. |
| GET /api/projects/:projectId/ui/overview | project_owner | yes | no | yes | Reads project UI overview data. |
| GET /api/projects/:projectId/ui/packets | project_owner | yes | no | yes | Reads project packet UI data. |
| GET /api/projects/:projectId/ui/artifacts | operator | yes | no | yes | Reads generated artifacts and evidence. |
| GET /api/projects/:projectId/ui/gate | operator | yes | no | yes | Reads governance gate state. |
| GET /api/projects/:projectId/ui/proof-status | operator | yes | no | yes | Reads proof and validation status. |
| GET /api/projects/:projectId/ui/security-center | operator | yes | no | yes | Reads security audit data. |
| POST /api/projects/:projectId/security-center/dependency-scan | operator | yes | yes | yes | Runs a dependency/security scan for project artifacts. |
| POST /api/projects/:projectId/governance/approval | admin | yes | yes | yes | Approves or rejects governance release gates. |
| POST /api/projects/:projectId/deploy/promote | admin | yes | yes | yes | Promotes a project deployment. |
| POST /api/projects/:projectId/deploy/rollback | admin | yes | yes | yes | Rolls back a project deployment. |
| GET /api/projects/:projectId/ui/deployments | operator | yes | no | yes | Reads project deployment history. |
| GET /api/projects/:projectId/ui/audit | operator | yes | no | yes | Reads project audit events. |
