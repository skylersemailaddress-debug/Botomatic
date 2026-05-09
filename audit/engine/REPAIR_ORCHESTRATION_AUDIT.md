# Repair Orchestration Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether repair orchestration is bounded, replayable, validator-governed, and operationally trustworthy.

## Required Repair Properties

- repair attempts are classified
- repairs are linked to validators
- repairs replay validators
- repairs are bounded/retry-limited
- repairs produce evidence
- repairs support rollback
- repairs preserve Build Contract scope
- repairs are visible to users/operators

## Required Questions

1. Can repair loops run indefinitely?
2. Can repairs mutate unrelated systems?
3. Are repair attempts replayable?
4. Can repairs bypass approvals?
5. Are repairs correlated to runtime failures?
6. Can repairs silently degrade UX/runtime quality?
7. Are rollback paths available after repair failure?

## Initial Risks

### ROA-001 — retry storm risk

Severity:

```text
P1
```

Unbounded repair loops can destabilize orchestration systems.

### ROA-002 — repair drift risk

Severity:

```text
P1
```

Repairs may unintentionally exceed approved Build Contract scope.

### ROA-003 — hidden repair degradation risk

Severity:

```text
P1
```

Repairs can create subtle UX/runtime regressions without obvious failures.

## Desired Direction

```text
failure
-> classified repair
-> validator replay
-> bounded retries
-> rollback/recovery if needed
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| orchestration reasoning | GPT-5.5 | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
