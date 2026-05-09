# Validator Linkage Audit

## Status

```text
initial audit
```

## Purpose

Ensure validators and proof gates are selected and enforced directly from Build Contract requirements.

## Core Principle

Validators should derive from:

```text
approved requirements
```

not from:

```text
implicit assumptions or arbitrary defaults
```

## Required Linkage Properties

- validators map to contract requirements
- validators map to deployment expectations
- validators map to risk classifications
- validators map to generated-app type
- validators map to launch readiness expectations
- validator results update readiness state
- validator failures block unsupported claims

## Required Questions

1. Which validators are required for each contract type?
2. Can validators drift from contract scope?
3. Can deployment/export bypass required validators?
4. Can repairs skip validator replay?
5. Are generated-app validators selected dynamically?
6. Are riskier contracts assigned stricter validators?
7. Are unsupported claims blocked by validator state?

## Initial Risks

### VLA-001 — validator-contract drift risk

Severity:

```text
P1
```

Validators may not fully reflect approved contract requirements.

### VLA-002 — readiness mismatch risk

Severity:

```text
P1
```

Readiness language may diverge from actual validator state.

### VLA-003 — repair replay gap risk

Severity:

```text
P1
```

Repairs must replay validators relevant to changed contract requirements.

## Desired Direction

```text
Build Contract
-> validator selection
-> execution
-> evidence
-> readiness/claim state
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| validator implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
| release gating | GitHub Actions | GPT-5.5 |
