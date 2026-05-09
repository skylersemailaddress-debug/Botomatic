# Checkpoint and Recovery Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic supports durable checkpoints, deterministic recovery, and operational restart safety.

## Required Checkpoint Properties

- durable checkpoint persistence
- replayable checkpoint state
- validator correlation
- Build Contract correlation
- rollback compatibility
- tenant/project isolation
- immutable checkpoint metadata
- recovery audit trail

## Required Questions

1. Can execution resume from checkpoints?
2. Are checkpoints tied to exact orchestration state?
3. Can recovery replay validator state correctly?
4. Are failed recoveries diagnosable?
5. Can stale checkpoints corrupt execution?
6. Can checkpoints cross tenant/project boundaries?
7. Are rollback and recovery paths distinguishable?

## Initial Risks

### CRA-001 — stale checkpoint reuse risk

Severity:

```text
P1
```

Old checkpoints may not reflect current validator/runtime truth.

### CRA-002 — incomplete recovery replay risk

Severity:

```text
P1
```

Recovery must replay validator and orchestration state safely.

### CRA-003 — rollback/recovery confusion risk

Severity:

```text
P1
```

Rollback and recovery flows require explicit governance separation.

## Desired Direction

```text
execution
-> checkpoint
-> interruption/failure
-> replay/recovery
-> validator replay
-> resumed execution
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| recovery reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
