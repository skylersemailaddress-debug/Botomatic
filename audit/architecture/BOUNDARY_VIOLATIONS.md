# Boundary Violations

## Status

```text
initial classification
```

## Purpose

Track architectural boundary problems discovered during Phase 2.

## Classification Rules

| Severity | Meaning |
|---|---|
| P0 | architecture issue that invalidates commercial trust |
| P1 | major scalability/maintainability/runtime risk |
| P2 | medium-term refactor pressure |
| P3 | hygiene or clarity issue |

## Initial Findings

### BV-001 — oversized root command surface

Severity:

```text
P2
```

Observation:

The root `package.json` currently acts as a large operational command registry containing:

- baseline commands
- commercial validation
- deployment proofs
- repair proofs
- runtime proofs
- beta commands
- launch commands
- observability commands

Risk:

- command discoverability degradation
- inconsistent operational ownership
- accidental coupling
- hidden launch paths

Recommended Direction:

Move toward grouped command ownership:

```text
scripts/baseline/
scripts/commercial/
scripts/proof/
scripts/deployment/
scripts/ops/
```

### BV-002 — validation package breadth risk

Severity:

```text
P1
```

Observation:

`packages/validation` appears to contain:

- validators
- runtime proofs
- generated-app tests
- cache utilities
- commercial checks
- orchestration tests
- observability checks

Risk:

Validation, proof execution, runtime testing, and commercial governance may become tightly coupled.

Recommended Direction:

Future split candidates:

```text
packages/validators
packages/runtime-proof
packages/generated-app-evals
packages/commercial-gates
```

### BV-003 — unclassified app-like directory

Severity:

```text
P2
```

Observation:

`apps/claude-runner` exists but is not currently declared in root workspaces.

Risk:

- hidden runtime surface
- inconsistent dependency governance
- accidental production drift

Required Audit:

Classify as one of:

```text
canonical service
experimental service
obsolete service
external integration helper
```

## Tool / Model Ownership

| Task | Best Tool |
|---|---|
| architecture interpretation | GPT-5.5 |
| large-scale package decomposition | Claude Opus |
| implementation refactors | Codex/Cursor |
