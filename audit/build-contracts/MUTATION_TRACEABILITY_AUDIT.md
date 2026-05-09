# Mutation Traceability Audit

## Status

```text
initial audit
```

## Purpose

Ensure every autonomous or user-directed mutation is traceable to approved intent, Build Contract state, and validator replay.

## Required Mutation Properties

- mutation has source request
- mutation links to Build Contract version
- mutation has approval status
- mutation lists changed files/entities
- mutation triggers relevant validators
- mutation produces evidence
- mutation supports rollback/revert
- mutation is understandable to user

## Required Questions

1. What caused the mutation?
2. Was the mutation approved?
3. Which Build Contract version authorized it?
4. Which files/entities changed?
5. Which validators replayed?
6. Can the mutation be reverted?
7. Did repair create additional mutations?
8. Can the user understand the change?

## Initial Risks

### MTA-001 — hidden autonomous mutation risk

Severity:

```text
P1
```

Autonomous edits must be visible and auditable.

### MTA-002 — validator replay gap risk

Severity:

```text
P1
```

Mutations should replay relevant validators before readiness state changes.

### MTA-003 — rollback/revert ambiguity risk

Severity:

```text
P1
```

Users and operators must understand how to recover from bad mutations.

## Desired Direction

```text
request
-> approved contract version
-> mutation
-> validator replay
-> evidence
-> readiness update
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| traceability reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry | GPT-5.5 |
