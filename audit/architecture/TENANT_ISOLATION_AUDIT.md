# Tenant Isolation Audit

## Status

```text
initial audit
```

## Purpose

Determine whether Botomatic is structurally capable of safe multi-tenant commercial operation.

## Required Isolation Properties

- project isolation
- tenant isolation
- auth/session isolation
- secrets isolation
- deployment isolation
- generated-app isolation
- audit evidence isolation
- admin/support access governance

## Required Questions

1. Can one tenant access another tenant's projects?
2. Are generated apps isolated by tenant/project?
3. Are deployment credentials tenant-scoped?
4. Are runtime jobs tenant-scoped?
5. Are logs/evidence tenant-scoped?
6. Are repair loops tenant-safe?
7. Are preview/edit sessions isolated?
8. Is admin/support access auditable?

## Initial Risks

### TI-001 — tenant boundary source map not yet complete

Severity:

```text
P0
```

Commercial launch is impossible without trustworthy tenant isolation.

### TI-002 — generated-app/runtime separation requires proof

Severity:

```text
P1
```

Generated apps and orchestration systems must preserve isolation guarantees.

### TI-003 — deployment credential governance not yet audited

Severity:

```text
P1
```

Deployment/export systems require strict credential separation.

## Desired Direction

```text
tenant
  -> projects
    -> isolated workspaces
      -> isolated deployment/runtime
        -> isolated evidence
```

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| tenant architecture reasoning | GPT-5.5 | Claude Opus |
| security scanning | Semgrep/CodeQL | GPT-5.5 |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |

## Required Next Evidence

- auth/session boundary map
- project isolation map
- secrets handling map
- deployment credential map
- support/admin access map
