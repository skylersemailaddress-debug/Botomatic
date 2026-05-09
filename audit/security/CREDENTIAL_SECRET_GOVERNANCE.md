# Credential and Secret Governance

## Status

```text
initial audit
```

## Purpose

Evaluate whether credentials, tokens, API keys, deployment secrets, and runtime secrets are handled safely across Botomatic and generated applications.

## Required Governance Properties

- tenant-scoped secrets
- project-scoped secrets
- encrypted secret storage
- runtime secret isolation
- log redaction
- artifact redaction
- revocation support
- rotation support
- deployment credential isolation
- least-privilege access

## Required Questions

1. Can secrets leak into logs or artifacts?
2. Are secrets encrypted at rest and in transit?
3. Can generated apps access Botomatic secrets?
4. Are deployment credentials revocable?
5. Can repair/recovery systems expose secrets?
6. Are secrets scoped minimally?
7. Do CI/release systems scan for leaks?
8. Are support/admin tools restricted from raw secret access?

## Initial Risks

### CSG-001 — secret leakage risk

Severity:

```text
P1
```

Autonomous systems generate large volumes of logs, traces, and artifacts that can accidentally expose credentials.

### CSG-002 — generated-app credential crossover risk

Severity:

```text
P1
```

Generated apps must not inherit privileged Botomatic credentials.

### CSG-003 — stale credential persistence risk

Severity:

```text
P1
```

Long-running orchestration and deployments require revocation and rotation governance.

## Desired Direction

```text
tenant/project
-> isolated secrets
-> least-privilege runtime access
-> redacted logs/artifacts
-> revocable deployment credentials
```

## Required Security Tooling

```text
Gitleaks
TruffleHog
GitHub secret scanning
Vault/KMS
Semgrep/CodeQL
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| threat modeling | GPT-5.5 | Claude Opus |
| secret scanning | Gitleaks/TruffleHog | GitHub Actions |
| implementation | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
