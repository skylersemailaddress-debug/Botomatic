# Botomatic Validation Matrix

Status: Phase F active
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
| Documentation | Validate-Botomatic-Documentation | IMPLEMENTED (PASS) |
| Gate 4 Auth/Governance | Validate-Botomatic-AuthGovernanceGate4 | IMPLEMENTED (PASS) |

## Runtime Proof Matrix

| Gate | Runtime Proof | Status |
|---|---|---|
| Gate 4 | Local OIDC role and governance smoke proof | PASS (2026-04-23) |
| Gate 5 | Promote/rollback runtime scenario | PASS (2026-04-23) |
| Gate 6 | Auditability and diagnostics scenario | PENDING |
| Gate 7 | Proof-integrity consistency scenario | PENDING |

---

## Rule

No category may reach 10/10 without:
- validator implemented
- validator passing

No gate may be marked closed by proof without runtime evidence captured in-repo.

No enterprise launch claim allowed until all validators pass.
