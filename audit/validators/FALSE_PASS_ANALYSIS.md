# False Pass Analysis

## Status

```text
initial scaffold
```

## Purpose

Identify situations where Botomatic validators, proofs, or release gates can incorrectly pass broken or misleading outputs.

## False Pass Definition

A false pass occurs when:

```text
system reports success
while generated output, deployment, runtime behavior, security posture, or user experience is materially broken
```

## Required False-Pass Categories

| Category | Example |
|---|---|
| compile-only success | app compiles but crashes at runtime |
| screenshot-only success | screenshots pass while flows are broken |
| deployment-only success | deployment succeeds but app unusable |
| validator bypass | repair loop bypasses failing validator |
| stale evidence | old proof artifact treated as fresh |
| partial-flow success | one flow passes while critical flows fail |
| mocked success | mocks hide production/runtime failure |
| generated-app coupling | generated app works only inside Botomatic runtime |
| tenant bleed | one tenant's state visible to another |
| claim mismatch | UI/marketing claims exceed actual proof |

## Required Questions

1. Which validators are easiest to fool?
2. Which validators lack negative-path tests?
3. Which validators depend too heavily on mocks?
4. Which validators only verify syntax/types?
5. Which validators fail to verify user outcomes?
6. Which validators can silently timeout or skip?
7. Which validators can be bypassed by repair loops?

## Required Mitigations

- mutation testing
- negative-path suites
- fresh evidence requirements
- runtime smoke validation
- independent deployment validation
- repair-loop replay validation
- artifact correlation IDs
- release evidence packets

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| false-pass reasoning | GPT-5.5 | Claude Opus |
| mutation testing | StrykerJS | Vitest |
| runtime validation | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |

## Exit Standard

Botomatic must aggressively optimize against:

```text
false confidence
```

not merely against:

```text
visible failures
```