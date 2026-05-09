# Build Contract Architecture Audit

## Status

```text
initial audit
```

## Purpose

Determine whether Build Contracts are treated as first-class architectural objects rather than informal prompts.

## Required Properties

A Build Contract should define:

- requested product intent
- assumptions
- constraints
- deployment expectations
- commercial expectations
- validator requirements
- export expectations
- risk classifications
- approval state
- mutation permissions

## Required Architectural Questions

1. Is Build Contract state durable?
2. Is Build Contract approval mandatory before major execution?
3. Is Build Contract mutation auditable?
4. Are validators attached to Build Contract requirements?
5. Are deployment/export rights tied to Build Contract state?
6. Are repair loops constrained by Build Contract rules?
7. Can generated apps explain which contract requirements were satisfied?

## Initial Risks

### BC-001 — Build Contract lifecycle not yet source-mapped

Severity:

```text
P1
```

Need explicit source map for:

```text
contract creation
contract storage
contract mutation
contract approval
contract enforcement
contract evidence linkage
```

### BC-002 — conversational intent may outrun governance

Severity:

```text
P1
```

A conversational autonomous builder must avoid silent execution drift beyond approved intent.

### BC-003 — validator linkage not yet formally audited

Severity:

```text
P1
```

Validators should attach to explicit contract requirements, not implicit assumptions.

## Desired Direction

```text
user intent
-> normalized Build Contract
-> approved execution scope
-> validator-linked execution
-> evidence-linked release packet
```

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | GPT-5.5 |
| lifecycle refactor planning | Claude Opus | GPT-5.5 |
| runtime verification | Playwright/Vitest | Codex/Cursor |

## Required Next Evidence

- Build Contract schema map
- approval lifecycle map
- mutation lifecycle map
- validator linkage map
- release evidence linkage map
