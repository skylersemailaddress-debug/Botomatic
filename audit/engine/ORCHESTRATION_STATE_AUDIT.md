# Orchestration State Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic maintains durable, replayable, restart-safe orchestration state.

## Required State Properties

- durable state persistence
- replayable execution history
- Build Contract correlation
- validator correlation
- repair correlation
- checkpoint support
- restart safety
- rollback traceability
- tenant/project isolation

## Required Questions

1. Is orchestration state persisted durably?
2. Can execution resume after interruption?
3. Are repair attempts part of orchestration state?
4. Can state drift from runtime reality?
5. Are checkpoints immutable/auditable?
6. Are validator outcomes correlated to orchestration state?
7. Can rollback restore prior stable state?

## Initial Risks

### OSA-001 — state/runtime drift risk

Severity:

```text
P1
```

Execution state and runtime truth must remain synchronized.

### OSA-002 — replayability gap risk

Severity:

```text
P1
```

Autonomous systems require replayable execution histories.

### OSA-003 — checkpoint durability risk

Severity:

```text
P1
```

Recovery systems require durable checkpoint governance.

## Desired Direction

```text
Build Contract
-> orchestration state
-> execution events
-> validator evidence
-> checkpoints
-> recovery/rollback
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| orchestration reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
