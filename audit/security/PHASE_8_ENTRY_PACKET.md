# Phase 8 Entry Packet — Security and Tenant Isolation Hardening

## Purpose

Audit and harden Botomatic's security, permission, credential, sandbox, and tenant-isolation systems before commercial launch work proceeds.

## Phase Goal

Ensure Botomatic can safely support commercial users, generated apps, credentials, deployments, uploads, and multi-tenant project isolation.

## Required Audit Areas

1. tenant isolation
2. project/workspace isolation
3. authentication and authorization
4. route protection
5. credential and secret handling
6. upload and archive safety
7. generated-code sandboxing
8. deployment credential isolation
9. audit logs and access governance
10. dependency/security scanning
11. SSRF/XSS/CSRF exposure
12. admin/support access governance

## Required Outputs

```text
audit/security/SECURITY_AUDIT.md
audit/security/TENANT_ISOLATION_AUDIT.md
audit/security/CREDENTIAL_SECRET_GOVERNANCE.md
audit/security/SANDBOX_BOUNDARY_AUDIT.md
audit/security/PERMISSION_BOUNDARY_AUDIT.md
audit/security/UPLOAD_SAFETY_AUDIT.md
audit/security/PHASE_8_EXECUTIVE_SUMMARY.md
```

## Required Questions

1. Can tenants access each other's projects or generated apps?
2. Are credentials tenant/project-scoped?
3. Are generated apps sandboxed from Botomatic internals?
4. Are uploaded files safely handled?
5. Are routes protected by default?
6. Are admin/support actions auditable?
7. Are secrets redacted from logs and artifacts?
8. Are deployment credentials isolated and revocable?
9. Can generated code access host secrets or internal systems?
10. Do security scans run in CI/release gates?

## Required Security Tooling

```text
Semgrep
CodeQL
Gitleaks
TruffleHog
npm audit / OSV / Snyk
Trivy
Playwright/Vitest security tests
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| threat modeling | GPT-5.5 | Claude Opus |
| static security | Semgrep/CodeQL | GPT-5.5 |
| secret scanning | Gitleaks/TruffleHog | GitHub Actions |
| implementation | Codex/Cursor | Claude Opus |
| runtime exploit tests | Playwright/Vitest | Codex/Cursor |
| dependency review | npm audit/OSV/Snyk | GPT-5.5 |

## Exit Criteria

Phase 8 exits only when:

- tenant isolation risks are classified
- credential/secret governance is mapped
- sandbox boundaries are mapped
- upload safety is audited
- permission boundaries are audited
- required security tooling plan exists
- release-blocking security gates are defined
