# Rollback and Recovery Governance

## Status

```text
initial audit
```

## Purpose

Ensure rollback and recovery systems are explicit, auditable, replayable, and operationally safe.

## Core Principle

Rollback and recovery should be:

```text
intentional
observable
validator-governed
```

not:

```text
implicit side effects of repair logic
```

## Required Governance Properties

- rollback checkpoints
- recovery checkpoints
- validator replay after rollback
- deployment rollback governance
- Build Contract correlation
- mutation history preservation
- replayable recovery state
- tenant/project isolation

## Required Questions

1. Can rollback restore known-good state?
2. Can recovery resume safely after interruption?
3. Are rollback and repair systems separated?
4. Are rollback actions auditable?
5. Are deployment rollbacks validated?
6. Can rollback accidentally restore stale/broken state?
7. Are rollback/recovery actions understandable to operators/users?

## Initial Risks

### RRG-001 — stale rollback target risk

Severity:

```text
P1
```

Rollback systems require validator-correlated checkpoints.

### RRG-002 — repair/rollback confusion risk

Severity:

```text
P1
```

Repair loops and rollback systems must remain operationally distinct.

### RRG-003 — hidden recovery mutation risk

Severity:

```text
P1
```

Recovery actions must remain visible and auditable.

## Desired Direction

```text
failure/interruption
-> recovery or rollback decision
-> validator replay
-> durable resumed state
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
