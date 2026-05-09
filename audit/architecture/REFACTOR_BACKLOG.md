# Refactor Backlog

## Status

```text
initial backlog
```

## Rules

- no broad refactor before architecture classification
- prioritize commercial risk reduction
- prioritize boundary clarity
- prefer extraction over rewrite
- preserve proof evidence and launch gates

## Priority Scale

| Priority | Meaning |
|---|---|
| P0 | commercial trust blocker |
| P1 | major scalability/maintainability/runtime risk |
| P2 | medium-term architecture pressure |
| P3 | hygiene/refinement |

## Initial Backlog

### RB-001 — split validation package responsibilities

Priority:

```text
P1
```

Current Problem:

`packages/validation` appears to contain:

- validators
- proof runners
- generated-app evaluations
- runtime checks
- commercial checks
- orchestration tests

Desired Direction:

```text
packages/validators
packages/runtime-proof
packages/generated-app-evals
packages/commercial-gates
```

Recommended Tools:

```text
Architecture: GPT-5.5
Large extraction planning: Claude Opus
Implementation: Codex/Cursor
```

### RB-002 — classify and govern app-like runtime services

Priority:

```text
P1
```

Current Problem:

Some app-like runtime surfaces appear outside clear workspace governance.

Initial Example:

```text
apps/claude-runner
```

Desired Direction:

Every runtime surface must be classified as:

```text
canonical
experimental
ops-only
external integration
obsolete
```

### RB-003 — reduce root script sprawl

Priority:

```text
P2
```

Current Problem:

Root scripts currently function as a large operational registry.

Desired Direction:

Group operational concerns:

```text
baseline
commercial
proof
ops
deployment
security
```

### RB-004 — formalize generated-app isolation boundaries

Priority:

```text
P1
```

Current Problem:

Generated-app fixtures/evidence appear separated but ownership rules are not yet formalized.

Desired Direction:

Define:

- generated app source-of-truth rules
- export isolation rules
- preview/source sync guarantees
- validator ownership
- release evidence ownership

### RB-005 — formalize orchestration boundary map

Priority:

```text
P1
```

Current Problem:

Planner, executor, validation, repair, preview, and deployment responsibilities require explicit boundary mapping.

Desired Direction:

Create formal orchestration lifecycle map:

```text
intent intake
-> Build Contract
-> planning
-> generation
-> validation
-> repair
-> preview
-> deployment/export
-> evidence capture
```

## Not Approved Yet

The following are explicitly NOT approved during current Phase 2:

- large rewrites
- framework migrations
- UI redesign
- autonomous engine replacement
- deployment provider replacement
- broad package moves without graph evidence
