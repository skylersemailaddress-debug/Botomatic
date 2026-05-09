# Dashboard Rendering Architecture

## Purpose

Define how runtime operational dashboards are rendered and sourced.

## Rendering Pipeline

```text
runtime metrics
-> observability exporters
-> metrics aggregation
-> dashboard query layer
-> rendered operational dashboards
```

## Required Dashboard Sources

- runtime metrics
- validator replay metrics
- deployment runtime metrics
- sandbox execution metrics
- rollback metrics
- autoscaling metrics

## Required Dashboard Properties

- tenant-safe filtering
- project-safe filtering
- trace drill-down
- incident correlation
- deployment linkage
- rollback linkage

## Required Runtime Views

### Executive Operations View

- orchestration throughput
- deployment health
- rollback status
- runtime incidents

### Engineering Runtime View

- worker saturation
- queue depth
- validator replay backlog
- stale workers
- sandbox violations

### Governance View

- deployment approvals
- rollback triggers
- feature-flag status
- production activation stage

## Exit Criteria

Dashboard rendering exits only when:

- rendering layer exists
- query layer exists
- tenant filtering validated
- trace drill-down operational
- incident correlation operational
