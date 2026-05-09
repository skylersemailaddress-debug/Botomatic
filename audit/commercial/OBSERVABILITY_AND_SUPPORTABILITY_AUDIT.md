# Observability and Supportability Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated applications are observable, diagnosable, supportable, and operationally maintainable in commercial environments.

## Required Supportability Properties

- structured logging
- correlated tracing
- runtime metrics
- deployment diagnostics
- failure classification
- support-safe redaction
- tenant/project attribution
- rollback observability
- alerting integration
- operator diagnostics

## Required Questions

1. Can runtime failures be diagnosed quickly?
2. Are logs and traces attributable to deployments/jobs?
3. Are secrets redacted from diagnostics?
4. Can support teams distinguish platform vs generated-app failures?
5. Are rollback and recovery events observable?
6. Can generated apps emit actionable metrics?
7. Are operator diagnostics understandable?
8. Are observability systems safe for multi-tenant usage?

## Initial Risks

### OSA-001 — blind runtime failure risk

Severity:

```text
P1
```

Commercial systems require diagnosable runtime failures.

### OSA-002 — support attribution ambiguity risk

Severity:

```text
P1
```

Support systems must distinguish platform failures from generated-app failures.

### OSA-003 — unsafe diagnostic exposure risk

Severity:

```text
P1
```

Logs, traces, and metrics can expose sensitive tenant or credential data.

## Desired Direction

```text
generated app
-> structured observability
-> diagnosable operations
-> safe support tooling
-> auditable runtime lifecycle
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| observability reasoning | GPT-5.5 | Claude Opus |
| instrumentation | OpenTelemetry/Sentry | Codex/Cursor |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
