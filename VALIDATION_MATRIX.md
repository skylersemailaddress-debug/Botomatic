# Botomatic Validation Matrix

Status: Phase G active
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
| Final Launch Readiness | Validate-Botomatic-FinalLaunchReadiness | IMPLEMENTED (ACTIVE) |

## Runtime Proof Matrix

| Gate | Runtime Proof | Status |
|---|---|---|
| Gate 2 | End-to-end operator workflow scenario | PASS (2026-04-23) |
| Gate 3 | Runtime safety/restart continuity scenario | PASS (2026-04-23) |
| Gate 4 | Local OIDC role and governance smoke proof | PASS (2026-04-23) |
| Gate 5 | Promote/rollback runtime scenario | PASS (2026-04-23) |
| Gate 6 | Auditability and diagnostics scenario | PASS (2026-04-23) |
| Gate 7 | Proof-integrity consistency scenario | PENDING |

Gate 7 proof artifact (this cycle): docs/gate7/GATE7_VALIDATION_DEPTH_PROOF_2026-04-23.md
Builder benchmark artifact: release-evidence/runtime/builder_quality_benchmark.json
Observability runtime artifact: release-evidence/runtime/ops_observability.json

---

## Rule

No category may reach 10/10 without:
- validator implemented
- validator passing

No gate may be marked closed by proof without runtime evidence captured in-repo.

No enterprise launch claim allowed until all validators pass.
