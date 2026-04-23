# Botomatic RBAC Permission Matrix

Status: Phase D / Gate 4 active
Purpose: Define the canonical role model and route permission expectations for Botomatic.

## Gate 4 rule

Gate 4 is not closed by docs, code presence, or route strings alone.
It closes only by live runtime proof that:
- identity is trustworthy
- role mapping is correct
- dangerous actions are blocked for unauthorized actors
- authorized actors can complete allowed actions
- governance and approval behavior is truthful

## Canonical roles

### operator
Allowed to:
- create projects
- view project status
- view packets
- view audit
- run low-risk read flows

Not allowed to:
- replay repairs
- promote deployment
- rollback deployment
- bypass approvals
- perform admin-only governance actions

### reviewer
Allowed to:
- all operator actions
- review readiness and gate state
- inspect deployment state
- participate in approval workflows when enabled

Not allowed to:
- force admin-only replay or deployment actions unless explicitly approved by policy

### admin
Allowed to:
- all reviewer and operator actions
- repair/replay
- deployment promote
- rollback
- governance and approval actions
- dangerous write actions

## Route permission expectations

| Route | Method | Minimum role | Notes |
|---|---|---:|---|
| /api/health | GET | anonymous or authenticated | health truth surface only |
| /api/projects/intake | POST | operator | creates project state |
| /api/projects/:projectId/compile | POST | operator | mutates project truth |
| /api/projects/:projectId/plan | POST | operator | mutates execution plan |
| /api/projects/:projectId/dispatch/execute-next | POST | reviewer or admin | dangerous execution path |
| /api/projects/:projectId/repair/replay | POST | admin | already admin-scoped in modern runtime |
| /api/projects/:projectId/status | GET | operator | project truth read |
| /api/projects/:projectId/ui/overview | GET | operator | operational read |
| /api/projects/:projectId/ui/packets | GET | operator | packet inspection |
| /api/projects/:projectId/ui/artifacts | GET | reviewer | artifact inspection may expose write outputs |
| /api/projects/:projectId/ui/audit | GET | reviewer | audit should remain permissioned |
| /api/projects/:projectId/ui/gate | GET | reviewer | governance read |
| /api/projects/:projectId/deploy/promote | POST | admin | dangerous deployment write |
| /api/projects/:projectId/deploy/rollback | POST | admin | dangerous deployment write |

## Dangerous actions

The following are dangerous actions and must never be available to anonymous users:
- dispatch execute
- repair/replay
- promote
- rollback
- approval/governance mutation

These actions must also be blocked when role is insufficient.

## Governance requirements

Where approval workflows exist, route enforcement must validate:
- actor identity
- actor role
- approval state
- gate state

Role checks alone are not sufficient if governance state is required.

## Runtime proof required

To close Gate 4, a live scenario must prove:
1. operator cannot execute admin-only actions
2. reviewer cannot bypass admin-only restrictions
3. admin can perform allowed dangerous actions
4. approval-required actions remain blocked until approval is present
5. audit records the correct actor identity and role

## Implementation guidance

- Use the modern runtime only
- Do not rely on bearer token admin behavior as enterprise proof
- Route-to-role mapping should be explicit in code
- Validation summaries must state when runtime proof is still required
