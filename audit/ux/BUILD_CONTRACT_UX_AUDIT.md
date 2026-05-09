# Build Contract UX Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Build Contracts are understandable and trustworthy for non-technical users.

## Core Principle

Users should understand:

```text
what Botomatic believes it is building
```

before autonomous execution begins.

## Required UX Properties

- plain-English summaries
- visible assumptions
- visible limitations
- visible risk levels
- editable scope
- approval checkpoints
- validator/readiness expectations
- deployment expectations

## Required Questions

1. Can non-technical users understand Build Contracts?
2. Are assumptions clearly surfaced?
3. Can users safely modify requirements?
4. Are deployment/readiness expectations understandable?
5. Can users distinguish aspiration vs guaranteed outcomes?
6. Are risky actions highlighted clearly?
7. Can users see what validators will gate launch?

## Initial Risks

### BCUX-001 — assumption opacity risk

Severity:

```text
P1
```

Users may not understand what Botomatic inferred automatically.

### BCUX-002 — scope/readiness confusion risk

Severity:

```text
P1
```

Users may assume approval guarantees launch readiness.

### BCUX-003 — validator language complexity risk

Severity:

```text
P1
```

Validator concepts must be translated into understandable readiness language.

## Desired Direction

```text
conversation
-> understandable Build Contract
-> informed approval
-> governed execution
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| conversational UX review | GPT-5.5 | Playwright transcripts |
| implementation | Codex/Cursor | Claude Opus |
| visual review | Gemini | Playwright screenshots |
