# Runtime Dashboard Plan

## Purpose

Define the operational dashboards required for Botomatic runtime-spine production readiness.

## Required Dashboards

### Orchestration Health

Metrics:

- jobs queued
- jobs executing
- jobs completed
- jobs retrying
- jobs dead-lettered
- checkpoint restore count

---

### Worker Fleet Health

Metrics:

- active workers
- stale workers
- lease renewals
- lease expirations
- heartbeat gaps
- worker saturation

---

### Validator Runtime Health

Metrics:

- validator approvals
- validator blocks
- replay attempts
- replay failures
- validator latency

---

### Deployment Runtime Health

Metrics:

- deployments started
- deployments succeeded
- deployments timed out
- deployments rolled back
- deployment strategy distribution

---

### Sandbox Runtime Health

Metrics:

- sandbox executions
- sandbox blocks
- sandbox timeouts
- network policy blocks
- artifact extraction failures

## Required Dashboard Properties

- tenant/project scoped filtering
- trace drill-down
- release evidence linkage
- incident correlation
- support-safe redaction

## Exit Criteria

Dashboard planning exits only when:

- dashboard JSON/assets exist
- all metrics map to runtime emitters
- trace drill-down exists
- support-safe view exists
