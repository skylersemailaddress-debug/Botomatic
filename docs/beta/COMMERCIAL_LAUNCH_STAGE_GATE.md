# Commercial Launch Stage Gate

This document defines the final commercial launch gate used to prevent overclaiming.

- Current commercial launch claim stage: `enterprise_pilot`
- Not currently claimable stages: `public_launch`

Source of truth:
- `release-evidence/commercial_launch_stage_matrix.json`
- `npm run validate:commercial-launch`
- `Validate-Botomatic-CommercialLaunchStageGate`

## Stage matrix

| Stage | Security | Durable E2E | Tenant isolation | Deployment | Generated app quality | Observability | Support/runbooks | Legal/compliance | Billing (if applicable) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `local_dev` | `security_auth_beta_proof.json` | `orchestration_core_beta_proof.json` | `tenant_isolation_proof.json` | `docs/beta/HOSTED_COMMERCIAL_LAUNCH.md` | `builder_quality_benchmark.json` | `ops_observability.json` | `docs/runbooks/stuck-build.md` | `LEGAL_CLAIM_BOUNDARIES.md` | not applicable |
| `friends_family_beta` | `security_auth_beta_proof.json`, `no_secrets_beta_proof.json` | `orchestration_core_beta_proof.json`, `durable_fail_closed_beta_proof.json` | `tenant_isolation_proof.json` | `deployment_smoke_beta_proof.json`, `docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md` | `builder_quality_benchmark.json` | `ops_observability.json` | `docs/beta/RC_RUNBOOK.md`, `docs/beta/SUPPORT.md` | `docs/beta/BETA_TERMS.md`, `docs/beta/BETA_PRIVACY.md` | not applicable |
| `paid_beta` | `security_auth_beta_proof.json`, `no_secrets_beta_proof.json` | `orchestration_core_beta_proof.json`, `durable_fail_closed_beta_proof.json` | `tenant_isolation_proof.json` | `deployment_dry_run_proof.json`, `credentialed_deployment_readiness_proof.json` | `builder_quality_benchmark.json`, `domain_quality_scorecards.json` | `ops_observability.json` | `docs/runbooks/queue-backlog.md`, `docs/runbooks/bad-deploy-rollback.md` | `LEGAL_CLAIM_BOUNDARIES.md`, `EVIDENCE_BOUNDARY_POLICY.md`, `MARKETING_CLAIMS_ALLOWED.md` | not applicable in this repository proof profile |
| `enterprise_pilot` | `security_auth_beta_proof.json`, `no_secrets_beta_proof.json` | `orchestration_core_beta_proof.json`, `durable_fail_closed_beta_proof.json` | `tenant_isolation_proof.json` | `deployment_dry_run_proof.json`, `credentialed_deployment_readiness_proof.json`, `live_deployment_execution_readiness_proof.json` | `builder_quality_benchmark.json`, `domain_quality_scorecards.json`, `final_commercial_release_evidence.json` | `ops_observability.json`, `eval_suite_runtime_proof.json` | `docs/runbooks/supabase-outage.md`, `docs/runbooks/provider-outage.md`, `docs/runbooks/upload-abuse.md` | `LEGAL_CLAIM_BOUNDARIES.md`, `EVIDENCE_BOUNDARY_POLICY.md`, `MARKETING_CLAIMS_ALLOWED.md` | not applicable in this repository proof profile |
| `public_launch` | `security_auth_beta_proof.json`, `no_secrets_beta_proof.json` | `orchestration_core_beta_proof.json`, `durable_fail_closed_beta_proof.json` | `tenant_isolation_proof.json` | `live_deployment_provider_execution_proof.json` | `builder_quality_benchmark.json`, `domain_quality_scorecards.json`, `final_commercial_release_evidence.json` | `ops_observability.json` | `docs/runbooks/supabase-outage.md`, `docs/runbooks/provider-outage.md`, `docs/runbooks/data-isolation-alert.md` | `LEGAL_CLAIM_BOUNDARIES.md`, `EVIDENCE_BOUNDARY_POLICY.md`, `MARKETING_CLAIMS_ALLOWED.md` | `public_launch_billing_proof.json` (missing → stage blocked) |

## Claim boundary

Claims are bounded to the highest proven stage from the matrix. The gate fails closed when:
- any required proof artifact for a claimed stage is missing;
- docs/marketing drift away from the matrix;
- a not-claimable stage is presented as claimable.
