# Deployment Readiness Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated applications are deployable, repeatable, observable, and commercially supportable without hidden manual intervention.

## Required Deployment Properties

- deterministic builds
- deployment reproducibility
- environment validation
- rollback readiness
- infrastructure observability
- release gating
- deployment audit trails
- failure classification
- scalability expectations
- dependency governance

## Required Questions

1. Can deployments succeed reproducibly?
2. Are environment requirements explicit?
3. Can generated apps deploy without hidden manual fixes?
4. Are rollback paths validated?
5. Are deployment failures diagnosable?
6. Are deployment artifacts immutable and attributable?
7. Are scalability assumptions explicit?
8. Are release gates tied to deployment/runtime proof?

## Initial Risks

### DRA-001 — hidden deployment dependency risk

Severity:

```text
P1
```

Generated applications may require undocumented manual deployment steps.

### DRA-002 — rollback fragility risk

Severity:

```text
P1
```

Commercial deployments require validated rollback paths.

### DRA-003 — environment drift risk

Severity:

```text
P1
```

Deployment/runtime environments can silently diverge from validated assumptions.

## Desired Direction

```text
validated source
-> reproducible build
-> governed deployment
-> observable runtime
-> rollback-safe release
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| deployment reasoning | GPT-5.5 | Claude Opus |
| CI/CD implementation | GitHub Actions | Codex/Cursor |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
