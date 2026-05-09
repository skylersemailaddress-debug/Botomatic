# Preview Truthfulness Audit

## Status

```text
initial audit
```

## Purpose

Determine whether Botomatic preview experiences truthfully represent generated source, export readiness, and launch readiness.

## Core Principle

Preview should mean:

```text
this is what the user will actually get
```

not:

```text
an optimistic simulation disconnected from source or deployment truth
```

## Required Preview Truth Properties

- preview maps to real source state
- preview changes persist to source
- preview does not imply launch readiness
- preview errors are visible
- preview/export divergence is blocked
- visual edits use the same mutation pipeline as chat edits
- generated-app preview is tied to validation evidence

## Required Questions

1. Can preview diverge from source?
2. Can preview look correct while exported app is broken?
3. Can visual edits bypass validators?
4. Can preview hide runtime or accessibility failures?
5. Are preview readiness states evidence-backed?
6. Are mobile/responsive preview states validated?
7. Are source-sync failures launch-blocking?

## Initial Risks

### PT-001 — preview/source divergence risk

Severity:

```text
P1
```

Preview must never become a separate truth surface from source.

### PT-002 — preview/readiness confusion risk

Severity:

```text
P1
```

A nice-looking preview must not imply commercial launch readiness.

### PT-003 — visual edit validator bypass risk

Severity:

```text
P1
```

Visual edits must trigger the same validator/proof lifecycle as chat-driven edits.

## Desired Direction

```text
preview
-> source sync
-> validation
-> evidence
-> export/launch eligibility
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| preview truth reasoning | GPT-5.5 | Gemini |
| visual review | Gemini | Playwright screenshots |
| source-sync testing | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
