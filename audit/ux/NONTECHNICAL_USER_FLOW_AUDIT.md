# Nontechnical User Flow Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether a non-technical user can successfully move from idea to commercial-grade output using conversation-first workflows.

## Target Flow

```text
user idea
-> conversational intake
-> assumption clarification
-> Build Contract approval
-> autonomous generation
-> preview/review
-> repair if needed
-> launch/export decision
```

## Required UX Properties

- plain-English explanations
- visible assumptions
- visible risk levels
- clear approval moments
- understandable failures
- trustworthy readiness states
- optional advanced controls
- export clarity

## Required Questions

1. Can a first-time non-technical user understand the flow?
2. Does Botomatic ask too many technical questions?
3. Can users accidentally approve unsafe launches?
4. Can users understand generated-app limitations?
5. Are unsupported requests handled honestly?
6. Can users distinguish preview from launch-ready state?
7. Are repair attempts understandable?
8. Are advanced controls optional and isolated?

## Initial Risks

### NUF-001 — conversational ambiguity risk

Severity:

```text
P1
```

Botomatic must normalize intent safely before execution.

### NUF-002 — launch-readiness confusion risk

Severity:

```text
P1
```

Users may confuse preview/demo success with commercial readiness.

### NUF-003 — advanced-mode leakage risk

Severity:

```text
P1
```

Developer-oriented concepts must not dominate the default UX.

## Desired Direction

```text
conversation-first
approval-driven
trustworthy
non-technical-default
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| runtime walkthroughs | Playwright | GPT-5.5 |
| visual polish | Gemini | Playwright screenshots |
| implementation | Codex/Cursor | Claude Opus |
