# Deployment Proof Integrity Audit

## Status

```text
initial scaffold
```

## Purpose

Ensure deployment proof represents real deployable/runtime truth rather than optimistic CI success.

## Core Principle

Deployment proof means:

```text
real runtime behavior matches validated release evidence
```

not merely:

```text
build command succeeded
```

## Required Questions

1. Can deployment proofs pass while runtime is broken?
2. Can deployments succeed with missing env vars?
3. Can preview deployments differ from production deployments?
4. Can generated apps deploy independently from Botomatic core?
5. Are rollback paths tested?
6. Are deployment proofs correlated to release evidence?
7. Are deployment credentials isolated by tenant/project?
8. Are staging and production validations separated?

## Required Proof Layers

| Layer | Meaning |
|---|---|
| build proof | app builds successfully |
| runtime smoke proof | app boots and serves |
| UX smoke proof | critical flows work |
| deployment proof | target deployment succeeds |
| rollback proof | previous release recoverable |
| observability proof | runtime visible and traceable |
| tenant isolation proof | deployment preserves boundaries |

## Initial Risks

### DPI-001 — deployment checks currently noisy on audit branches

Severity:

```text
P2
```

Observed external deployment checks (Vercel/Railway) currently create noise during audit PRs.

### DPI-002 — deployment/runtime distinction requires stronger governance

Severity:

```text
P1
```

Build success alone is insufficient proof of runtime correctness.

### DPI-003 — staging/production separation not yet formalized

Severity:

```text
P1
```

Commercial launch requires explicit staging and release governance.

## Desired Direction

```text
validated release candidate
-> staging deployment proof
-> runtime smoke proof
-> rollback proof
-> production approval
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| deployment reasoning | GPT-5.5 | Claude Opus |
| runtime smoke testing | Playwright/Vitest | Codex/Cursor |
| deployment orchestration | GitHub Actions | deployment providers |
| implementation | Codex/Cursor | Claude Opus |

## Exit Standard

Deployment proof should eventually guarantee:

```text
runtime trustworthiness
```

not merely:

```text
successful CI execution
```