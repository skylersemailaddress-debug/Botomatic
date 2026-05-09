# Validator Execution Lifecycle

## Status

```text
initial scaffold
```

## Purpose

Define the expected lifecycle for validators from Build Contract requirements through execution, repair, evidence, and release gating.

## Target Lifecycle

```text
Build Contract requirement
-> validator selection
-> validator execution
-> evidence capture
-> failure classification
-> repair attempt if allowed
-> validator replay
-> evidence update
-> release/claim gate decision
```

## Required Lifecycle Properties

- deterministic execution
- non-bypassable launch-critical validators
- structured failure classification
- artifact-backed evidence
- replay after repair
- correlation to project/build/tenant
- freshness requirements
- release gate linkage

## Required Questions

1. Which system selects validators?
2. Are validators selected from explicit Build Contract requirements?
3. Are validators run before every launch/export claim?
4. Are failed validators replayed after repair?
5. Is evidence correlated to the exact build output?
6. Can validators be skipped by advanced/pro modes?
7. Can stale evidence be reused accidentally?
8. Are release-blocking validators distinguishable from advisory validators?

## Initial Risks

### VEL-001 — validator selection source not yet mapped

Severity:

```text
P1
```

### VEL-002 — evidence freshness model not yet mapped

Severity:

```text
P1
```

### VEL-003 — advisory vs blocking validator distinction incomplete

Severity:

```text
P1
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| lifecycle reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime replay testing | Playwright/Vitest | Codex/Cursor |
| release gating | GitHub Actions | GPT-5.5 |
