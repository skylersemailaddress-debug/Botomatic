# Gate 4 RBAC Specification

## Role Model

Three roles are defined in `apps/orchestrator-api/src/auth/roles.ts`.

| Role | Description |
|---|---|
| `operator` | Default role. Can read project state and submit new projects. Cannot trigger execution or make dangerous mutations. |
| `reviewer` | Can trigger execution, view artifacts, gate status, deployments, and audit events. Cannot repair, replay, or promote to production. |
| `admin` | Full access. Can repair/replay failed packets and promote deployments. Implicit when using a static bearer token. |

## Identity Sources

| Source | Config field | Role assignment |
|---|---|---|
| OIDC token (JWT) | `auth.implementation = "oidc"` | Derived from `https://botomatic.dev/role` or `role` claim via `mapClaimsToRole`. Unmapped claims default to `operator`. |
| Static bearer token | `auth.implementation = "bearer_token"` | Always `admin`. |
| No auth configured | `auth.enabled = false` | Blocked — `requireApiAuth` returns 500. |

## Permission Matrix

All `/api/projects/*` routes are guarded by a global `requireApiAuth` middleware. Routes with dangerous side-effects carry an additional `requireRole` guard.

| Route | Method | Min Role | Enforcement |
|---|---|---|---|
| `/api/health` | GET | none | open |
| `/api/projects/intake` | POST | operator | `requireApiAuth` |
| `/api/projects/:id/compile` | POST | operator | `requireApiAuth` |
| `/api/projects/:id/plan` | POST | operator | `requireApiAuth` |
| `/api/projects/:id/status` | GET | operator | `requireApiAuth` |
| `/api/projects/:id/ui/overview` | GET | operator | `requireApiAuth` |
| `/api/projects/:id/ui/packets` | GET | operator | `requireApiAuth` |
| `/api/projects/:id/dispatch/execute-next` | POST | **reviewer** | `requireRole("reviewer")` |
| `/api/projects/:id/ui/artifacts` | GET | **reviewer** | `requireRole("reviewer")` |
| `/api/projects/:id/ui/gate` | GET | **reviewer** | `requireRole("reviewer")` |
| `/api/projects/:id/ui/deployments` | GET | **reviewer** | `requireRole("reviewer")` |
| `/api/projects/:id/ui/audit` | GET | **reviewer** | `requireRole("reviewer")` |
| `/api/projects/:id/governance/approval` | POST | **admin** | `requireRole("admin")` |
| `/api/projects/:id/repair/replay` | POST | **admin** | `requireRole("admin")` |
| `/api/projects/:id/deploy/promote` | POST | **admin** | `requireRole("admin")` |
| `/api/projects/:id/deploy/rollback` | POST | **admin** | `requireRole("admin")` |

## Dangerous Actions

| Action | Required Role | Reason |
|---|---|---|
| Governance approval transition (`governance/approval`) | admin | Captures runtime proof and records explicit governance approval state required for sensitive operations. |
| Packet execution (`dispatch/execute-next`) | reviewer | Triggers live code generation and git operations. |
| Repair/replay (`repair/replay`) | admin | Mutates packet state and clears git history. Irreversible without manual intervention. |
| Environment promotion (`deploy/promote`) | admin | Moves a build from staging to production. |
| Environment rollback (`deploy/rollback`) | admin | Reverts promoted deployment state and must be traceable in audit logs. |

## Governance Boundary

A `GovernanceApprovalState` record (model version `gate4-minimal-v1`) is maintained on every project.  
Default state on creation: `approvalStatus: "pending"`, `runtimeProofRequired: true`.  
Gate status (`/ui/gate`) reflects governance approval. Runtime operators can explicitly update this state through `POST /api/projects/:id/governance/approval`; approval cannot be set to `"approved"` until runtime proof is marked `"captured"`.
`repair/replay` and `deploy/promote` now enforce this governance state and return `409` when proof/approval requirements are unmet.

## Implementation Files

| File | Purpose |
|---|---|
| `apps/orchestrator-api/src/auth/roles.ts` | `UserRole` type, `AuthContext`, `resolveRole` |
| `apps/orchestrator-api/src/auth/oidc.ts` | `verifyOidcBearerToken`, `mapClaimsToRole`, JWKS cache |
| `apps/orchestrator-api/src/server_app.ts` | `requireApiAuth`, `requireRole`, `getVerifiedAuth` middleware |
| `apps/orchestrator-api/src/gates/gateTypes.ts` | `LaunchGateStatus`, `ApprovalStatus`, `GateSummary` |
| `packages/supabase-adapter/src/types.ts` | `GovernanceApprovalState` |

## Closure Note

This document satisfies the repo-side deliverables for Issue 19:
- explicit role model ✅
- permission matrix for all sensitive routes ✅
- dangerous action restrictions by role ✅
- approval/governance boundaries ✅

**Gate 4 closure itself requires runtime proof.** See Issues 20, 21, 22.
