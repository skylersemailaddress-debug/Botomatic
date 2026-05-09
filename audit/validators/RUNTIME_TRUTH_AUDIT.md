# Runtime Truth Audit

## Status

```text
initial scaffold
```

## Purpose

Determine whether Botomatic validates actual runtime/user truth rather than relying too heavily on compile-time or simulated success.

## Core Principle

A trustworthy autonomous builder validates:

```text
real runtime behavior experienced by real users
```

not merely:

```text
successful generation or compilation
```

## Required Runtime Truth Layers

| Layer | Example |
|---|---|
| compile truth | app builds/types correctly |
| startup truth | app boots successfully |
| navigation truth | routes/pages function |
| interaction truth | forms/buttons/flows work |
| accessibility truth | keyboard/screen-reader usability |
| deployment truth | deployed runtime behaves correctly |
| persistence truth | saved state/data survives correctly |
| tenant truth | isolation preserved |
| repair truth | repaired runtime still works |
| rollback truth | previous stable version recoverable |

## Required Questions

1. Which validators verify actual user flows?
2. Which validators rely only on static checks?
3. Which validators use mocks instead of runtime systems?
4. Which runtime truths are currently unverified?
5. Which runtime truths require staging deployment?
6. Which runtime truths require generated-app export testing?
7. Can runtime drift occur after validation?

## High-Risk Runtime Areas

```text
preview vs production runtime
repair-loop runtime drift
deployment env var drift
generated-app portability
multi-tenant state separation
```

## Required Future Infrastructure

- runtime smoke suites
- deployment smoke suites
- generated-app runtime suites
- adversarial runtime suites
- rollback runtime suites
- tenant isolation runtime suites

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| runtime truth reasoning | GPT-5.5 | Claude Opus |
| runtime interaction testing | Playwright/Vitest | Codex/Cursor |
| deployment runtime proof | GitHub Actions | deployment providers |
| implementation | Codex/Cursor | Claude Opus |

## Exit Standard

Botomatic should eventually optimize for:

```text
runtime truthfulness
```

not:

```text
superficial validator success
```