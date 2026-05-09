# Observability Exporter Plan

## Purpose

Define production exporter requirements for runtime-spine observability.

## Required Exporters

### Trace Exporter

Targets:

- OpenTelemetry collector
- distributed traces
- validator replay traces
- deployment execution traces
- rollback traces

### Metrics Exporter

Targets:

- runtime metrics sink
- queue metrics
- worker fleet metrics
- sandbox metrics
- deployment metrics

### Error Exporter

Targets:

- Sentry
- incident correlation
- runtime failure attribution
- deployment failure attribution

## Required Export Properties

- tenant/project attribution
- trace correlation
- support-safe redaction
- deployment linkage
- validator lineage linkage
- rollback linkage

## Exported Runtime Signals

- runtime.job.executing
- runtime.validator.approved
- runtime.validator.blocked
- runtime.retry.escalated
- runtime.dead_letter.created
- runtime.heartbeat.stale
- runtime.sandbox.blocked
- runtime.deployment.timed_out
- runtime.rollback.started
- runtime.rollback.completed

## Required Future Proof Gates

```text
proof:trace-export
proof:metrics-export
proof:error-export
proof:redaction-export
proof:tenant-attribution-export
```

## Exit Criteria

Exporter planning exits only when:

- OpenTelemetry exporter exists
- metrics exporter exists
- Sentry/error exporter exists
- redaction tests exist
- tenant attribution tests exist
