# Botomatic Validation Matrix

Status: Universal-builder launch-gate closure achieved
Purpose: Map each launch category to required validators.

---

## Validators

| Category | Validator | Status |
|----------|----------|--------|
| Architecture | Validate-Botomatic-Architecture | IMPLEMENTED (PASS) |
| Builder Capability | Validate-Botomatic-BuilderCapability | IMPLEMENTED (PASS) |
| UI | Validate-Botomatic-UIReadiness | IMPLEMENTED (PASS) |
| Security | Validate-Botomatic-Security | IMPLEMENTED (PASS) |
| Governance | Validate-Botomatic-Governance | IMPLEMENTED (PASS) |
| Reliability | Validate-Botomatic-Reliability | IMPLEMENTED (PASS) |
| Observability | Validate-Botomatic-Observability | IMPLEMENTED (PASS) |
| Launch Readiness | Validate-Botomatic-LaunchReadiness | IMPLEMENTED (PASS) |
| Deployment Rollback (Gate 5) | Validate-Botomatic-DeploymentRollbackGate5 | IMPLEMENTED (PASS) |
| Documentation | Validate-Botomatic-Documentation | IMPLEMENTED (PASS) |
| Gate 4 Auth/Governance | Validate-Botomatic-AuthGovernanceGate4 | IMPLEMENTED (PASS) |
| UI Control-Plane Integration | Validate-Botomatic-UIControlPlaneIntegration | IMPLEMENTED (PASS) |
| Builder Quality Benchmarks | Validate-Botomatic-BuilderQualityBenchmarks | IMPLEMENTED (PASS: caseCount=31, average=10/10, universal=10/10, criticalFailures=0 as of 2026-04-26) |
| Behavioral Runtime Coverage | Validate-Botomatic-BehavioralRuntimeCoverage | IMPLEMENTED (PASS) |
| Observability Runtime Evidence | Validate-Botomatic-ObservabilityRuntimeEvidence | IMPLEMENTED (PASS) |
| Production Proof Profile | Validate-Botomatic-ProductionProofProfile | IMPLEMENTED (PASS) |
| Final Launch Readiness | Validate-Botomatic-FinalLaunchReadiness | IMPLEMENTED (PASS) |
| File Ingestion | Validate-Botomatic-FileIngestion | IMPLEMENTED (PASS) |
| Chat-First Operator Routing | Validate-Botomatic-ChatFirstOperatorRouting | IMPLEMENTED (PASS) |
| Universal Builder Readiness | Validate-Botomatic-UniversalBuilderReadiness | IMPLEMENTED (PASS) |
| Multi-Domain Emitted Output Readiness | Validate-Botomatic-MultiDomainEmittedOutputReadiness | IMPLEMENTED (PASS) |
| Domain Runtime Command Execution Readiness | Validate-Botomatic-DomainRuntimeCommandExecutionReadiness | IMPLEMENTED (PASS) |
| External Integration and Deployment Readiness | Validate-Botomatic-ExternalIntegrationDeploymentReadiness | IMPLEMENTED (PASS) |
| Deployment Dry-Run Readiness | Validate-Botomatic-DeploymentDryRunReadiness | IMPLEMENTED (PASS) |
| Credentialed Deployment Readiness | Validate-Botomatic-CredentialedDeploymentReadiness | IMPLEMENTED (PASS) |
| Live Deployment Execution Readiness | Validate-Botomatic-LiveDeploymentExecutionReadiness | IMPLEMENTED (PASS) |
| Final Commercial Release Evidence | Validate-Botomatic-FinalCommercialReleaseEvidence | IMPLEMENTED (PASS) |
| Secrets & Credential Management Readiness | Validate-Botomatic-SecretsCredentialManagementReadiness | IMPLEMENTED (PASS) |
| Autonomous Complex Build Readiness | Validate-Botomatic-AutonomousComplexBuildReadiness | IMPLEMENTED (PASS) |
| Domain Quality Scorecards Readiness | Validate-Botomatic-DomainQualityScorecardsReadiness | IMPLEMENTED (PASS) |
| Eval Suite Readiness | Validate-Botomatic-EvalSuiteReadiness | IMPLEMENTED (PASS) |
| Security Center Readiness | Validate-Botomatic-SecurityCenterReadiness | IMPLEMENTED (PASS) |
| First-Run Experience Readiness | Validate-Botomatic-FirstRunExperienceReadiness | IMPLEMENTED (PASS) |
| Validation Cache Readiness | Validate-Botomatic-ValidationCacheReadiness | IMPLEMENTED (PASS) |
| Installer Runtime Readiness | Validate-Botomatic-InstallerRuntimeReadiness | IMPLEMENTED (PASS) |
| Large-File Intake Readiness | Validate-Botomatic-LargeFileIntakeReadiness | IMPLEMENTED (PASS) |
| Multi-Source Intake Readiness | Validate-Botomatic-MultiSourceIntakeReadiness | IMPLEMENTED (PASS) |
| Self-Upgrading Factory Readiness | Validate-Botomatic-SelfUpgradingFactoryReadiness | IMPLEMENTED (PASS) |
| Dirty Repo Rescue Readiness | Validate-Botomatic-DirtyRepoRescueReadiness | IMPLEMENTED (PASS) |
| Universal Capability Stress Readiness | Validate-Botomatic-UniversalCapabilityStressReadiness | IMPLEMENTED (PASS) |

Current constraint:
- `Validate-Botomatic-BuilderQualityBenchmarks` must remain passing at strict thresholds (caseCount>=31, >= 8.5 launchable, >= 9.2 universal when universal pass claimed, zero critical failures, zero per-case strictness violations).

Runtime-proof harness requirements (content-inspected validators):
- `Validate-Botomatic-UniversalBuilderReadiness` requires `release-evidence/runtime/greenfield_runtime_proof.json` and checks route execution + validator results.
- `Validate-Botomatic-DirtyRepoRescueReadiness` requires `release-evidence/runtime/dirty_repo_runtime_proof.json` and checks detection evidence, completion-contract depth, repair-plan shape, and validator-run presence.
- `Validate-Botomatic-SelfUpgradingFactoryReadiness` requires `release-evidence/runtime/self_upgrade_runtime_proof.json` and checks drift/regression proof content, non-weakening signal, and branch-safe/non-mutating proof output.
- `Validate-Botomatic-UniversalCapabilityStressReadiness` requires `release-evidence/runtime/universal_pipeline_runtime_proof.json` and checks extracted truth/missing-questions/assumptions/architecture/build artifacts plus domain-matrix depth fields.
- `Validate-Botomatic-UniversalBuilderReadiness` and `Validate-Botomatic-UniversalCapabilityStressReadiness` require per-domain runtime depth evidence in `release-evidence/runtime/domain_runtime_depth_matrix.json` with zero failed domains.
- `Validate-Botomatic-MultiDomainEmittedOutputReadiness` requires `release-evidence/runtime/multi_domain_emitted_output_proof.json` and enforces fail-closed emitted-tree readiness across required representative launch domains with zero failed domains.
- `Validate-Botomatic-DomainRuntimeCommandExecutionReadiness` requires `release-evidence/runtime/domain_runtime_command_execution_proof.json` plus non-empty command logs under `release-evidence/runtime/logs/` and fails closed on missing declarations, malformed records, failed required commands, or undocumented skips.
- `Validate-Botomatic-ExternalIntegrationDeploymentReadiness` requires `release-evidence/runtime/external_integration_deployment_readiness_proof.json` and fails closed on missing domain rows, invalid integration contract schema, undocumented external service skips, failed secret scans, or missing deployment readiness status.
- `Validate-Botomatic-DeploymentDryRunReadiness` requires `release-evidence/runtime/deployment_dry_run_proof.json` and fails closed on missing domain rows, missing or empty dryRunMethod, missing smoke-test plan, missing rollback plan, missing live-deployment-skip reason, or any domain with dryRunStatus=failed.
- `Validate-Botomatic-CredentialedDeploymentReadiness` requires `release-evidence/runtime/credentialed_deployment_readiness_proof.json` and fails closed on missing required domain credential rows, absent approval-gate block-by-default assertions, missing provider adapter preflight contract, missing dry-run/live separation model, missing secret-policy pass signals, or any domain not marked ready_for_approved_credentialed_deployment.
- `Validate-Botomatic-LiveDeploymentExecutionReadiness` requires `release-evidence/runtime/live_deployment_execution_readiness_proof.json` and fails closed on any live-execution claim, missing required domain/provider coverage, missing approval/credential/checklist/execution/smoke/rollback/audit contracts, pre-approved approvals in proof mode, secret-like credential binding content, or missing caveat.
- `Validate-Botomatic-FinalCommercialReleaseEvidence` validates final commercial release evidence completeness and launch-safety posture using `release-evidence/runtime/final_commercial_release_evidence.json`; enforced flags: `noLiveDeploymentClaim=true`, `noRealSecretsUsed=true`, `noRealProviderApisCalled=true`, `liveDeploymentBlockedByDefault=true`, `representativeNotExhaustive=true`.
- `Validate-Botomatic-SecretsCredentialManagementReadiness` requires `release-evidence/runtime/secrets_credential_management_readiness_proof.json` and fails closed when secret-reference model/workflows/profiles are missing, `.gitignore` does not protect env files, proof artifacts contain secret-like plaintext values, secrets UI surface is missing, audit events are not redacted, deployment preflight lacks secret status, or live deployment would proceed while required secrets are missing.
- `Validate-Botomatic-AutonomousComplexBuildReadiness` requires `release-evidence/runtime/autonomous_complex_build_readiness_proof.json` and fails closed when autonomous build package components are missing, milestone/checkpoint/repair/escalation/final-assembler readiness is absent, one-click launch package requirement is missing, low-risk autonomy or high-risk escalation policy is missing, proof claims live deployment, or caveat language is missing.
- `Validate-Botomatic-DomainQualityScorecardsReadiness` requires `release-evidence/runtime/domain_quality_scorecards.json` and fails closed when per-domain readiness scorecards are missing, below strict thresholds, or missing representative caveat language.
- `Validate-Botomatic-EvalSuiteReadiness` requires `release-evidence/runtime/eval_suite_runtime_proof.json` and fails closed when required eval categories are missing or any eval status fails.
- `Validate-Botomatic-SecurityCenterReadiness` enforces Security Center API and UI presence for threat model, RBAC matrix, data privacy posture, dependency risk scan, supply-chain checks, and security audit surface.
- `Validate-Botomatic-FirstRunExperienceReadiness` enforces first-run onboarding + What's Next panel coverage for build-from-idea, spec upload, dirty-repo upload, key configuration, local launch, and deployment preparation paths.
- `Validate-Botomatic-ValidationCacheReadiness` enforces fast command wiring and content-hash validator cache implementation (`validate:fast`, `validate:changed`, `proof:fast`, `cache:clear`).
- `Validate-Botomatic-InstallerRuntimeReadiness` enforces installer/doctor/easy-start runtime anchors, package script wiring, and Linux shell-script executable permission checks.
- `Validate-Botomatic-LargeFileIntakeReadiness` requires `release-evidence/runtime/large_file_intake_readiness_proof.json` and fails closed on hardcoded 10 MB intake limits, upload max below 100 MB, missing archive traversal/zip-bomb guards, missing extraction limits, missing progress events, or non-config-driven UI max upload messaging.
- `Validate-Botomatic-MultiSourceIntakeReadiness` requires `release-evidence/runtime/multi_source_intake_readiness_proof.json` and fails closed on missing multi-source intake routes, source-model coverage, intake-router decisions, adapter modules, intake lifecycle events, Intake Hub UI wiring, or no-code-execution intake declarations.
- `Validate-Botomatic-Documentation` enforces launch-truth alignment across `LAUNCH_BLOCKERS.md`, `READINESS_SCORECARD.json`, `release-evidence/manifest.json`, and `README.md`.
- `Validate-Botomatic-UIReadiness` and `Validate-Botomatic-UIControlPlaneIntegration` now enforce enterprise surface wiring, no-placeholder UI signals, loading/error/empty states, and real API service bindings.

Proof harness commands:
- `npm run -s proof:greenfield`
- `npm run -s proof:dirty-repo`
- `npm run -s proof:self-upgrade`
- `npm run -s proof:universal-pipeline`
- `npm run -s proof:domain-scorecards`
- `npm run -s proof:eval-suite`
- `npm run -s proof:multi-domain-emitted-output`
- `npm run -s proof:domain-runtime-commands`
- `npm run -s proof:external-deployment-readiness`
- `npm run -s proof:deployment-dry-run`
- `npm run -s proof:credentialed-deployment-readiness`
- `npm run -s proof:live-deployment-execution-readiness`
- `npm run -s proof:secrets-credential-management`
- `npm run -s proof:autonomous-complex-build`
- `npm run -s proof:large-file-intake`
- `npm run -s proof:multi-source-intake`
- `npm run -s proof:fast`
- `npm run -s proof:all`

Fast commands:
- `npm run -s validate:fast`
- `npm run -s validate:changed`
- `npm run -s cache:clear`

## Runtime Proof Matrix

| Gate | Runtime Proof | Status |
|---|---|---|
| Gate 2 | End-to-end operator workflow scenario | PASS (2026-04-23) |
| Gate 3 | Runtime safety/restart continuity scenario | PASS (2026-04-23) |
| Gate 4 | External Auth0 OIDC admin proof + OIDC negative-path coverage | PASS (2026-04-24) |
| Gate 5 | Durable deploy/promote/rollback/restart continuity | PASS (2026-04-24) |
| Gate 6 | Telemetry + external Slack delivery proof | PASS (2026-04-24) |
| Gate 7 | Proof-integrity consistency scenario | PASS (2026-04-23) |

Gate 4 artifacts: release-evidence/runtime/production-external/OIDC_AUTH0_PROOF_2026-04-24.md, release-evidence/runtime/production-external/OIDC_NEGATIVE_PATH_PROOF_2026-04-24.md, release-evidence/runtime/oidc_rbac_governance_production_like.json
Gate 5 artifact: release-evidence/runtime/production-external/DURABLE_DEPLOY_ROLLBACK_RESTART_PROOF_2026-04-24.md
Gate 6 artifacts: release-evidence/runtime/production-external/TELEMETRY_ALERT_PROOF_2026-04-24.md, release-evidence/runtime/production-external/EXTERNAL_ALERT_DELIVERY_PROOF_2026-04-24.md

---

## Rule

No category may reach 10/10 without:
- validator implemented
- validator passing

No gate may be marked closed by proof without runtime evidence captured in-repo.

Commercial universal-builder launch claim is allowed only when all validators pass and strict builder benchmark thresholds are met.
