# Confidence and Readiness Signaling Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic communicates confidence, uncertainty, readiness, and blockers based on evidence rather than optimistic language.

## Core Principle

Readiness signals must be:

```text
evidence-backed
```

not:

```text
model-confidence-backed alone
```

## Required Signaling Properties

- confidence linked to evidence
- uncertainty surfaced plainly
- readiness linked to validator state
- deployment readiness separated from preview readiness
- commercial readiness separated from build success
- claim readiness separated from aspiration
- blockers mapped to next actions

## Required Questions

1. Can Botomatic overstate readiness?
2. Can users distinguish draft, preview, validated, and launch-ready states?
3. Are confidence scores tied to actual proof?
4. Are unsupported/uncertain states visible?
5. Are readiness labels stale-proof resistant?
6. Can public claims appear without proof?
7. Are blockers mapped to user/operator actions?

## Initial Risks

### CRS-001 — readiness overstatement risk

Severity:

```text
P1
```

Autonomous builders can easily overstate completion when only partial proof exists.

### CRS-002 — model confidence vs evidence confusion

Severity:

```text
P1
```

Reasoning confidence must not substitute for validators, runtime proof, or deployment evidence.

### CRS-003 — blocker action ambiguity

Severity:

```text
P1
```

Users need clear next steps when readiness is blocked.

## Desired Direction

```text
reasoning confidence
+
validator evidence
+
runtime proof
+
claim boundary
=
readiness signal
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| readiness reasoning | GPT-5.5 | Claude Opus |
| UX wording | GPT-5.5 | Gemini |
| implementation | Codex/Cursor | Claude Opus |
| runtime validation | Playwright/Vitest | Codex/Cursor |
