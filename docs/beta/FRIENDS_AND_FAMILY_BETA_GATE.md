# Friends-and-Family Beta Readiness Gate

Botomatic is **not** friends-and-family beta-ready just because build, test, and repository validation pass. The beta gate is a hard, fail-closed evidence gate that requires dedicated runtime proof artifacts for the private beta blockers.

## Commands

Run the readiness gate only:

```bash
npm run beta:readiness
```

Run the full beta gate:

```bash
npm run beta:gate
```

`beta:gate` runs `build`, `test`, `validate:all`, and then `beta:readiness`. Passing build/test/validate is necessary but not sufficient; `beta:readiness` is the final fail-closed check.

## Required proof artifacts

The readiness gate requires all of these JSON artifacts to exist under `release-evidence/runtime/`:

| Blocker | Required artifact |
| --- | --- |
| Tenant/project isolation proof | `release-evidence/runtime/tenant_isolation_proof.json` |
| Production/beta auth fail-closed proof | `release-evidence/runtime/security_auth_beta_proof.json` |
| No-secrets proof across source/history/evidence/logs/generated apps/UI/API | `release-evidence/runtime/no_secrets_beta_proof.json` |
| Durable orchestration E2E proof | `release-evidence/runtime/orchestration_core_beta_proof.json` |
| Durable storage outage fail-closed proof | `release-evidence/runtime/durable_fail_closed_beta_proof.json` |
| Beta deployment smoke/rollback proof | `release-evidence/runtime/deployment_smoke_beta_proof.json` |

Do not create placeholder or hand-written passing artifacts. These files must be produced by real proof runs or audit processes that exercise the stated blocker.

## Required proof signals

Each artifact must contain a JSON object with a `signals` object. Every named signal below must be present and passing. A signal passes when it is a positive boolean, a non-failing status string, or an object whose `passed`, `pass`, `ok`, `success`, `verified`, or non-failing `status` field indicates success.

### Tenant/project isolation proof

`release-evidence/runtime/tenant_isolation_proof.json` must include:

- `cross_tenant_read_blocked`
- `cross_tenant_write_blocked`
- `project_scope_enforced`
- `tenant_context_required`
- `isolation_regression_suite_passed`

### Production/beta auth fail-closed proof

`release-evidence/runtime/security_auth_beta_proof.json` must include:

- `unauthenticated_requests_blocked`
- `invalid_session_blocked`
- `expired_session_blocked`
- `privileged_routes_require_auth`
- `production_beta_auth_fail_closed`

### No-secrets proof

`release-evidence/runtime/no_secrets_beta_proof.json` must include:

- `source_secret_scan_passed`
- `git_history_secret_scan_passed`
- `release_evidence_secret_scan_passed`
- `logs_secret_scan_passed`
- `generated_apps_secret_scan_passed`
- `ui_api_secret_scan_passed`

### Durable orchestration E2E proof

`release-evidence/runtime/orchestration_core_beta_proof.json` must include:

- `durable_job_created`
- `worker_restarted_and_resumed`
- `state_persisted_across_restart`
- `idempotent_retry_verified`
- `end_to_end_completion_verified`

### Durable storage outage fail-closed proof

`release-evidence/runtime/durable_fail_closed_beta_proof.json` must include:

- `storage_outage_detected`
- `writes_blocked_during_outage`
- `unsafe_reads_blocked_during_outage`
- `no_in_memory_success_fallback`
- `service_recovered_after_storage_restore`

### Beta deployment smoke/rollback proof

`release-evidence/runtime/deployment_smoke_beta_proof.json` must include:

- `beta_environment_deployed`
- `post_deploy_smoke_passed`
- `healthcheck_passed`
- `rollback_exercised`
- `post_rollback_smoke_passed`

## Aggregate gate output

Every `beta:readiness` run writes an aggregate result to:

```text
release-evidence/runtime/beta_readiness_gate.json
```

The aggregate includes:

- whether the gate passed
- the complete required artifact list
- missing proof artifacts
- invalid JSON artifacts
- missing proof signals
- failing proof signals
- per-artifact details

This aggregate is diagnostic evidence only. It is not a substitute for the six required proof artifacts.

## Fail-closed behavior

The gate fails if any required artifact is missing, unparsable, missing a required signal, or has a non-passing signal. Failure output names the missing artifacts and missing or failing signals so the next proof-producing task can target the blocker directly.
