# Trust and Failure Handling Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic handles failures, unsupported requests, uncertainty, and launch blockers in a trustworthy and understandable way.

## Core Principle

Users should experience:

```text
honest confidence
```

not:

```text
optimistic deception
```

## Required UX Properties

- plain-English failure explanations
- visible uncertainty
- explicit unsupported-request handling
- evidence-backed readiness language
- rollback/repair clarity
- no fake success states
- no fake progress indicators
- no hidden launch blockers

## Required Questions

1. Are unsupported requests clearly explained?
2. Are failures actionable?
3. Are launch blockers visible?
4. Are assumptions visible before execution?
5. Can users tell the difference between preview and production readiness?
6. Are repair attempts visible and understandable?
7. Can users trust readiness labels?
8. Are confidence levels evidence-backed?

## Initial Risks

### TFH-001 — optimistic readiness language risk

Severity:

```text
P1
```

Generated software systems are vulnerable to overstating readiness.

### TFH-002 — unsupported-request ambiguity risk

Severity:

```text
P1
```

Users must understand what Botomatic cannot safely do.

### TFH-003 — hidden repair activity risk

Severity:

```text
P1
```

Autonomous repair should not silently mutate user projects without visible governance.

## Desired Direction

```text
clear
calm
truthful
explainable
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| trust/failure reasoning | GPT-5.5 | Gemini |
| runtime walkthroughs | Playwright | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |
| accessibility | axe-core | Lighthouse |
