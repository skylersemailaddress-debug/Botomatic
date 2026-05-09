# Job Lifecycle Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether autonomous jobs/tasks are durable, replayable, traceable, and operationally governable.

## Required Job Properties

- durable job IDs
- lifecycle states
- checkpoint support
- retry governance
- cancellation support
- replay support
- validator correlation
- Build Contract correlation
- tenant/project isolation
- observability/tracing

## Required Lifecycle States

```text
queued
planned
approved
executing
repairing
validated
blocked
failed
rolled-back
completed
```

## Required Questions

1. Are job states durable?
2. Can jobs resume after interruption?
3. Can jobs be replayed deterministically?
4. Can failed jobs be diagnosed?
5. Can jobs exceed approved scope?
6. Are retries bounded?
7. Can users/operators inspect lifecycle state?
8. Are validator and deployment events correlated to jobs?

## Initial Risks

### JLA-001 — orphaned job risk

Severity:

```text
P1
```

Interrupted autonomous jobs require recovery governance.

### JLA-002 — lifecycle ambiguity risk

Severity:

```text
P1
```

Users/operators need understandable lifecycle states.

### JLA-003 — replay nondeterminism risk

Severity:

```text
P1
```

Autonomous jobs should be reproducible enough for diagnosis and trust.

## Desired Direction

```text
Build Contract
-> job
-> execution lifecycle
-> validator evidence
-> release/rollback state
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| orchestration reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
