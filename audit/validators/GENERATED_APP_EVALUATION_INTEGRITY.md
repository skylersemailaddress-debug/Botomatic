# Generated App Evaluation Integrity

## Status

```text
initial scaffold
```

## Purpose

Ensure generated-app evaluators prove that Botomatic outputs are real, portable, commercial-grade applications rather than demos or tightly coupled internal artifacts.

## Required Evaluation Properties

- standalone build proof
- runtime smoke proof
- no placeholder proof
- accessibility proof
- responsive proof
- security proof
- deployment proof
- rollback proof
- commercial readiness proof
- export portability proof

## Required Questions

1. Can generated apps build outside Botomatic?
2. Can generated apps run outside Botomatic?
3. Can generated apps deploy independently?
4. Can generated apps pass no-placeholder checks?
5. Can generated apps pass core UX flows?
6. Are generated app proofs tied to exact exported artifacts?
7. Can generated app validators falsely pass demo-quality output?
8. Are generated app validators domain-aware?

## High-Risk False-Pass Areas

```text
placeholder content
fake integrations
nonfunctional forms
mock-only billing/auth
missing persistence
inaccessible UI
responsive breakage
hidden Botomatic runtime coupling
```

## Required Evidence Fields

```text
generated app ID
source artifact hash
build command
runtime command
validator set
deployment target
smoke results
known limitations
release decision
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| evaluation reasoning | GPT-5.5 | Claude Opus |
| generated-app inspection | GPT-5.5 | Gemini |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| accessibility | axe-core | Lighthouse |
| implementation | Codex/Cursor | Claude Opus |

## Exit Standard

Generated apps should never be called commercial-ready unless their exported artifacts pass commercial-readiness validators independently.