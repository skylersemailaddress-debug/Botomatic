# Alerting and Dashboard Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic surfaces meaningful alerts, dashboards, operational metrics, and degraded-state visibility suitable for enterprise operations.

## Required Alerting Properties

- severity-scoped alerts
- tenant-impact awareness
- validator failure alerts
- deployment failure alerts
- runtime degradation alerts
- queue/backpressure alerts
- incident escalation linkage
- operator dashboards
- support-safe dashboards
- alert attribution

## Required Questions

1. Are alerts actionable or noisy?
2. Are degraded states surfaced clearly?
3. Can operators distinguish generated-app vs platform failures?
4. Are alerts correlated to incidents and traces?
5. Can validator failures trigger release blocks?
6. Are dashboards meaningful to support teams?
7. Are alert thresholds evidence-based?
8. Are alerts tenant-safe and privacy-aware?

## Initial Risks

### ADA-001 — alert fatigue risk

Severity:

```text
P1
```

Noisy alerting can destabilize operational response.

### ADA-002 — degraded-state invisibility risk

Severity:

```text
P1
```

Commercial operations require meaningful runtime visibility.

### ADA-003 — attribution ambiguity risk

Severity:

```text
P1
```

Support and operators require attributable diagnostics.

## Desired Direction

```text
runtime signal
-> classified alert
-> correlated diagnostics
-> operational dashboard
-> incident/release action
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| observability reasoning | GPT-5.5 | Claude Opus |
| dashboards/alerts | Grafana/Datadog | GPT-5.5 |
| instrumentation | OpenTelemetry/Sentry | Codex/Cursor |
| runtime validation | Playwright/Vitest | Codex/Cursor |
