# Repair Loop Trust Audit

## Status

```text
initial scaffold
```

## Purpose

Determine whether autonomous repair loops are trustworthy, bounded, observable, and validator-governed.

## Core Principle

Repair systems must:

```text
reduce failure risk
```

not:

```text
hide failure state
```

## Required Questions

1. Can repair loops bypass validators?
2. Can repair loops silently regress unrelated functionality?
3. Are repair attempts correlated to evidence?
4. Are repair retries bounded?
5. Can repair loops enter unstable cycles?
6. Are repair actions tenant-safe?
7. Are repair actions deployment-safe?
8. Are repair actions auditable?
9. Can repair loops create false-pass states?
10. Are repairs replayable and reproducible?

## Required Evidence

Every repair attempt should eventually produce:

```text
repair attempt ID
triggering validator
changed files
re-run validators
result state
rollback path
tenant/project correlation
runtime correlation ID
```

## High-Risk Areas

| Risk | Example |
|---|---|
| validator bypass | repair marks success without rerun |
| localized repair regression | fixes one issue but breaks another |
| retry storms | repeated unstable retries |
| hidden mutation | repair changes unrelated files |
| stale proof reuse | repair reuses old evidence |
| deployment drift | repaired runtime differs from validated runtime |

## Desired Direction

```text
failure
-> classified
-> repair attempt
-> validator replay
-> evidence capture
-> bounded retry
-> explicit success/failure
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| repair governance reasoning | GPT-5.5 | Claude Opus |
| runtime replay testing | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |

## Exit Standard

Repair loops should eventually be:

```text
observable
replayable
bounded
validator-governed
rollback-safe
```

rather than:

```text
best-effort autonomous retries
```