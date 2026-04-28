# DEPLOY-003 Route-Level Provider Contract Gates

`/api/projects/:projectId/deploy/promote` now enforces provider deployment contracts at route time (in addition to governance and launch readiness checks):
- provider handoff completeness evidence must exist (fail-closed if missing)
- handoff status must be `complete` or `blocked` (planning-only allowed)
- `approvalRequired === true`
- `rollbackPlanPresent === true`
- `smokePlanPresent === true`
- `deployCommandTemplatePresent === true`
- provider secret preflight linkage must exist
- `plaintextSecretsStored === false`
- `preflightRequiredBeforeDeploy === true`
- response explicitly remains non-live (`liveExecutionClaimed: false`)

`/api/projects/:projectId/deploy/rollback` now enforces rollback contracts at route time:
- prior promoted state still required
- provider rollback completeness evidence must exist (fail-closed if missing)
- rollback status must be `complete` or `blocked` (planning-only allowed)
- `approvalRequired === true`
- `rollbackCommandTemplatePresent === true`
- `previousVersionReferenceRequired === true`
- `dataRollbackBoundaryDocumented === true`
- response explicitly remains non-live (`liveRollbackExecutionClaimed: false`)

## Evidence Source and Fail-Closed Behavior
The routes load provider contract evidence from committed/runtime proof artifacts under `release-evidence/runtime` and do not call live providers. If evidence is missing or malformed, routes block with explicit `providerGate` reasons such as `missing_provider_contract` / `needs_evidence`.

## DEPLOY-002 Relationship
DEPLOY-002 established package-local provider handoff/rollback/smoke/secret-preflight contracts and validator coverage. DEPLOY-003 closes the enforcement gap by applying those contracts directly in the promote/rollback API routes.

## Caveat
These routes do not execute live deployment or live rollback, and must not be interpreted as production launch success evidence.
