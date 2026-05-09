# Assumption Governance Audit

## Status

```text
initial audit
```

## Purpose

Ensure Botomatic handles inferred assumptions transparently, safely, and reversibly.

## Core Principle

Botomatic should distinguish clearly between:

```text
user-approved facts
```

and:

```text
system assumptions
```

## Required Assumption Properties

- assumptions visible to users
- assumptions confidence-scored
- assumptions editable
- assumptions approval-governed
- assumptions linked to validators
- assumptions linked to deployment readiness
- assumptions replayable/auditable

## Required Questions

1. Which assumptions may be made automatically?
2. Which assumptions require explicit approval?
3. Can assumptions drift after approval?
4. Can repairs create new assumptions?
5. Can deployment/export proceed on unapproved assumptions?
6. Can assumptions silently change runtime behavior?
7. Are assumptions understandable to non-technical users?

## Initial Risks

### AGA-001 — hidden inference risk

Severity:

```text
P1
```

Users may not understand what Botomatic inferred automatically.

### AGA-002 — assumption drift risk

Severity:

```text
P1
```

Later mutations/repairs may invalidate earlier assumptions.

### AGA-003 — unsafe assumption automation risk

Severity:

```text
P1
```

Some assumptions should never be made autonomously without explicit approval.

## Desired Direction

```text
user request
-> explicit assumptions
-> approval
-> validator-linked execution
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| conversational UX | GPT-5.5 | Gemini |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
