# Conversational Onboarding Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether first-time users can understand Botomatic's capabilities, limits, and workflow through conversational onboarding.

## Required Onboarding Properties

- plain-English capability explanation
- clear expectation setting
- visible limits and constraints
- understandable examples
- minimal technical jargon
- guided first success path
- explicit launch/readiness distinctions
- safe assumption handling

## Required Questions

1. Can a first-time user understand what Botomatic does?
2. Are limitations explained early enough?
3. Can users distinguish prototype vs commercial-ready outputs?
4. Are assumptions clarified before execution?
5. Is onboarding calm rather than overwhelming?
6. Are advanced concepts deferred until needed?
7. Can users recover from onboarding mistakes?

## Initial Risks

### COA-001 — expectation inflation risk

Severity:

```text
P1
```

Autonomous builders can accidentally imply broader capability than currently proven.

### COA-002 — jargon overload risk

Severity:

```text
P1
```

Developer terminology can overwhelm non-technical users.

### COA-003 — launch-readiness misunderstanding risk

Severity:

```text
P1
```

Users may not understand the distinction between:

```text
prototype
validated app
commercial-ready release
```

## Desired Direction

```text
welcoming
truthful
calm
clear
non-technical-first
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| onboarding reasoning | GPT-5.5 | Gemini |
| conversational flow review | GPT-5.5 | Playwright transcripts |
| visual review | Gemini | Playwright screenshots |
| implementation | Codex/Cursor | Claude Opus |
