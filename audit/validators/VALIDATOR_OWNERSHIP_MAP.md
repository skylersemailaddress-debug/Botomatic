# Validator Ownership Map

## Status

```text
initial scaffold
```

## Purpose

Map each validator class to an owning package, phase, evidence standard, and release-blocking role.

## Ownership Model

| Validator Class | Owner Area | Primary Phase | Blocking Role |
|---|---|---:|---|
| baseline proof | runtime proof tier | 1 | baseline-blocking |
| commercial proof | commercial gates | 9-13 | release-blocking |
| max-power proof | domain coverage benchmark | 14 | claim-blocking |
| claim boundary | claim gates | 0 / 3 / 15 | claim-blocking |
| generated-app readiness | generated app evaluators | 9 | release-blocking |
| tenant isolation | security validators | 8 | release-blocking |
| deployment proof | deployment gates | 13 | release-blocking |
| observability proof | reliability gates | 11 | release-blocking |
| accessibility proof | UX/generated app gates | 4 / 9 | release-blocking |
| repair-loop proof | engine validators | 6 / 11 | release-blocking |

## Required Owner Fields

Every validator must eventually define:

```text
owner package
owner phase
runtime dependencies
evidence artifact
negative-path test
false-pass risk
release blocking status
claim impact
```

## Initial Ownership Risks

### VOM-001 — validator classes not yet mapped to packages

Severity:

```text
P1
```

### VOM-002 — release-blocking status not consistently explicit

Severity:

```text
P1
```

### VOM-003 — evidence artifacts not yet standardized across validators

Severity:

```text
P1
```

## Desired Direction

```text
validator
-> owner
-> phase
-> evidence
-> negative-path coverage
-> claim/release impact
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| ownership reasoning | GPT-5.5 | Claude Opus |
| validator refactors | Codex/Cursor | Claude Opus |
| release-gate mapping | GitHub Actions | GPT-5.5 |
| mutation testing | StrykerJS | Vitest |
