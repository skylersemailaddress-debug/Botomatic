# Planner Executor Boundary Audit

## Status

```text
initial audit
```

## Purpose

Ensure planning, execution, repair, and deployment responsibilities are explicitly separated and governable.

## Core Principle

A trustworthy autonomous builder separates:

```text
planning
```

from:

```text
execution
```

and both from:

```text
repair
release
rollback
```

## Required Boundary Properties

- planner proposes actions
- executor performs approved actions
- repair loops replay validators
- release gates remain independent
- rollback systems remain independent
- planner state is inspectable
- executor mutations are traceable
- deployment actions require explicit gates

## Required Questions

1. Can planning mutate state directly?
2. Can execution bypass approvals?
3. Can repair loops bypass release gates?
4. Are rollback paths independent from repair logic?
5. Can planner assumptions drift silently?
6. Can execution exceed approved Build Contract scope?
7. Are deployment actions isolated from planning state?

## Initial Risks

### PEB-001 — planner/executor coupling risk

Severity:

```text
P1
```

Planning logic should not silently mutate runtime state.

### PEB-002 — repair/release coupling risk

Severity:

```text
P1
```

Repair loops must not implicitly authorize release readiness.

### PEB-003 — rollback governance gap

Severity:

```text
P1
```

Rollback systems require independent auditability.

## Desired Direction

```text
intent
-> planner
-> approved execution plan
-> executor
-> validators
-> repair/recovery if needed
-> release gate
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| orchestration reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
