# Negative Path Testing

## Status

```text
initial scaffold
```

## Purpose

Ensure Botomatic reliably detects broken, adversarial, incomplete, deceptive, unsafe, or commercially invalid outputs.

## Principle

A trustworthy autonomous builder is measured primarily by:

```text
how reliably it fails bad outputs
```

not merely by:

```text
how often happy paths pass
```

## Required Negative-Path Classes

| Class | Example |
|---|---|
| syntax corruption | malformed files |
| type corruption | invalid type usage |
| runtime crashes | app crashes during startup |
| broken navigation | routes unusable |
| inaccessible UX | keyboard/screen-reader failures |
| invalid environment configuration | missing secrets/env vars |
| deployment failure | runtime build/deploy failure |
| repair regression | repair fixes one thing but breaks another |
| hallucinated feature success | feature claimed but non-functional |
| tenant isolation failure | cross-tenant visibility |
| proof artifact corruption | invalid/stale proof evidence |
| commercial invalidity | generated app not realistically releasable |

## Required Questions

1. Which negative paths are currently tested?
2. Which negative paths are currently untested?
3. Which failures are detectable only by runtime interaction?
4. Which failures are detectable only by real deployment?
5. Which failures can bypass validators?
6. Which failures create false confidence?

## Required Tooling

| Need | Tool |
|---|---|
| runtime interaction | Playwright |
| compile/type validation | TypeScript/Vitest |
| mutation testing | StrykerJS |
| deployment proof | GitHub Actions + staging |
| accessibility proof | axe-core |
| security proof | Semgrep/CodeQL |

## Required Future Infrastructure

- adversarial generated-app corpus
- intentionally broken fixtures
- deployment-failure fixtures
- tenant-boundary attack fixtures
- repair-loop regression fixtures
- stale-proof fixtures

## Exit Standard

Botomatic should eventually maintain:

```text
a continuously growing corpus of known-bad outputs
```

that must always fail deterministically.