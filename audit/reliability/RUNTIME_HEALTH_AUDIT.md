# Runtime Health Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic can detect, report, and recover from unhealthy runtime states across platform services, orchestration jobs, generated apps, and deployment workflows.

## Required Runtime Health Properties

- health checks
- readiness checks
- liveness checks
- dependency health checks
- queue health checks
- orchestration health checks
- generated-app health checks
- deployment health checks
- degraded-mode indicators
- user/operator status separation

## Required Questions

1. Are health checks meaningful or superficial?
2. Can readiness differ from liveness?
3. Can unhealthy dependencies be isolated?
4. Are generated-app health states separated from platform health?
5. Are degraded states visible to users and operators?
6. Can release gates consume runtime health signals?
7. Are health checks correlated to incidents?
8. Can rollback/recovery restore healthy runtime state?

## Initial Risks

### RHA-001 — superficial health check risk

Severity:

```text
P1
```

A basic process-alive check is insufficient for commercial runtime readiness.

### RHA-002 — generated-app/platform health confusion risk

Severity:

```text
P1
```

Generated-app runtime failures must not be confused with platform failures.

### RHA-003 — degraded-state invisibility risk

Severity:

```text
P1
```

Users and operators need reliable degraded-state signals.

## Desired Direction

```text
runtime signal
-> health classification
-> user/operator status
-> incident/recovery action
-> release gate signal
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| reliability reasoning | GPT-5.5 | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |
| runtime validation | Playwright/Vitest | Codex/Cursor |
