# Botomatic Validation Matrix

Status: Universal-builder transition in progress
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
| Builder Quality Benchmarks | Validate-Botomatic-BuilderQualityBenchmarks | IMPLEMENTED (PASS) |
| Behavioral Runtime Coverage | Validate-Botomatic-BehavioralRuntimeCoverage | IMPLEMENTED (PASS) |
| Observability Runtime Evidence | Validate-Botomatic-ObservabilityRuntimeEvidence | IMPLEMENTED (PASS) |
| Production Proof Profile | Validate-Botomatic-ProductionProofProfile | IMPLEMENTED (PASS) |
| Final Launch Readiness | Validate-Botomatic-FinalLaunchReadiness | IMPLEMENTED (PASS) |
| File Ingestion | Validate-Botomatic-FileIngestion | IMPLEMENTED (PASS) |
| Chat-First Operator Routing | Validate-Botomatic-ChatFirstOperatorRouting | IMPLEMENTED (PASS) |
| Universal Builder Readiness | Validate-Botomatic-UniversalBuilderReadiness | IMPLEMENTED (PASS) |

Current constraint:
- `Validate-Botomatic-BuilderQualityBenchmarks` is expected to fail until benchmark quality reaches strict thresholds (>= 8.5 launchable, >= 9.2 universal, zero critical failures).

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
