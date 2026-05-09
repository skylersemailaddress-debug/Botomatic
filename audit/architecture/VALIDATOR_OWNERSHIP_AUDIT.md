# Validator Ownership Audit

## Status

```text
initial ownership audit
```

## Purpose

Determine whether validators, proof runners, commercial gates, generated-app evaluators, and claim gates have clear ownership boundaries.

## Required Ownership Categories

```text
repo validators
runtime proofs
commercial gates
generated-app evaluators
security validators
claim-boundary validators
release evidence validators
```

## Initial Risks

### VO-001 — validator ownership concentrated in broad package

Severity:

```text
P1
```

`packages/validation` appears to own many validator types. This is acceptable for early velocity but risky for long-term commercial governance.

### VO-002 — proof tiers require ownership labels

Severity:

```text
P1
```

Phase 1 added proof tiers. Phase 2 must now map each tier to an owner and phase:

```text
proof:baseline -> Phase 1 / baseline integrity
proof:commercial -> Phases 8-13 / commercial readiness
proof:max-power -> Phase 14 / 99% capability proof
proof:all -> Phase 15 / final release candidate
```

### VO-003 — claim gates must be separated from implementation tests

Severity:

```text
P1
```

Claim gates should govern what Botomatic may say publicly. They should not be mixed invisibly with ordinary implementation tests.

## Desired Direction

```text
validators/             static and contract checks
runtime-proof/          executable proof harnesses
commercial-gates/       launch/commercial evidence gates
generated-app-evals/    generated app readiness checks
claim-gates/            public claim boundary enforcement
```

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| validator ownership reasoning | GPT-5.5 | Claude Opus |
| validator implementation | Codex/Cursor | GPT-5.5 |
| large split/refactor | Claude Opus | Codex/Cursor |
| false-pass testing | StrykerJS | GPT-5.5 |

## Required Next Evidence

- validator inventory
- command-to-owner map
- proof-tier-to-phase map
- claim-gate map
- CI enforcement map
