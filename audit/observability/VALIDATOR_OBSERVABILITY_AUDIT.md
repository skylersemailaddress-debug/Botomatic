# Validator Observability Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether validators, proof gates, runtime checks, and release evidence remain observable, attributable, and operationally actionable.

## Required Observability Properties

- validator execution traces
- validator/runtime correlation
- Build Contract correlation
- deployment/release correlation
- validator replay visibility
- failure classification
- evidence retention
- operator diagnostics
- tenant/project attribution
- rollback/recovery visibility

## Required Questions

1. Can validator failures be diagnosed rapidly?
2. Are validator outcomes tied to releases and deployments?
3. Can replayed validators be distinguished from initial runs?
4. Are validator outputs durable and attributable?
5. Can generated-app validators be separated from platform validators?
6. Are validator failures mapped to actionable next steps?
7. Are unsupported claims blocked when validators fail?
8. Can operators inspect validator history safely?

## Initial Risks

### VOA-001 — opaque validator failure risk

Severity:

```text
P1
```

Enterprise release governance requires diagnosable validator systems.

### VOA-002 — validator/release mismatch risk

Severity:

```text
P1
```

Release claims must remain linked to validator-backed proof.

### VOA-003 — replay ambiguity risk

Severity:

```text
P1
```

Repair/recovery validator runs require durable attribution and replay visibility.

## Desired Direction

```text
validator run
-> observable execution
-> attributable evidence
-> release linkage
-> operational diagnostics
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| observability reasoning | GPT-5.5 | Claude Opus |
| instrumentation | OpenTelemetry/Sentry | Codex/Cursor |
| dashboards | Grafana/Datadog | GPT-5.5 |
| runtime validation | Playwright/Vitest | Codex/Cursor |
