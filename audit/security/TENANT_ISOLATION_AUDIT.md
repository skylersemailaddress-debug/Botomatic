# Tenant Isolation Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic enforces strict isolation between tenants, projects, generated apps, execution state, and deployment resources.

## Required Isolation Properties

- tenant-scoped storage
- tenant-scoped orchestration state
- tenant-scoped memory/context
- tenant-scoped credentials
- tenant-scoped generated apps
- tenant-scoped logs/evidence
- tenant-scoped deployments
- isolation-aware recovery/rollback

## Required Questions

1. Can one tenant access another tenant's projects?
2. Can orchestration state leak across tenants?
3. Can generated apps access shared runtime state?
4. Are deployment credentials isolated?
5. Can retrieval/memory systems cross tenant boundaries?
6. Are logs and evidence tenant-scoped?
7. Can repair/recovery systems violate isolation guarantees?

## Initial Risks

### TIA-001 — cross-tenant state leakage risk

Severity:

```text
P1
```

Autonomous orchestration systems require strict tenant-scoped state.

### TIA-002 — generated-app boundary risk

Severity:

```text
P1
```

Generated applications must not access Botomatic internals or unrelated tenant resources.

### TIA-003 — recovery/isolation bypass risk

Severity:

```text
P1
```

Rollback/recovery systems must preserve tenant boundaries.

## Desired Direction

```text
tenant
-> isolated workspace
-> isolated orchestration
-> isolated generated apps
-> isolated deployments
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| threat modeling | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| security scanning | Semgrep/CodeQL | GPT-5.5 |
