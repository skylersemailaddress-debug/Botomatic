# Generated App Operability Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated applications remain maintainable, operable, diagnosable, and supportable after generation.

## Required Operability Properties

- maintainable architecture
- understandable structure
- diagnosable runtime failures
- observable logs/metrics
- update/repair governance
- rollback compatibility
- dependency governance
- supportability boundaries
- scalability expectations
- accessibility readiness

## Required Questions

1. Can generated apps be maintained after generation?
2. Are generated structures understandable to operators/developers?
3. Can runtime failures be diagnosed quickly?
4. Are updates/repairs bounded and traceable?
5. Can generated apps survive dependency updates?
6. Are observability hooks present?
7. Are support boundaries clear to users/operators?
8. Are generated apps scalable beyond demo workloads?

## Initial Risks

### GOA-001 — unmaintainable generated architecture risk

Severity:

```text
P1
```

Generated software must remain operable after initial creation.

### GOA-002 — unsupported repair drift risk

Severity:

```text
P1
```

Repeated repairs may silently degrade maintainability and architecture quality.

### GOA-003 — observability gap risk

Severity:

```text
P1
```

Commercial supportability requires diagnosable runtime systems.

## Desired Direction

```text
governed generation
-> maintainable architecture
-> observable runtime
-> diagnosable operations
-> supportable lifecycle
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| architecture reasoning | GPT-5.5 | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
