# Proof Freshness Governance

## Status

```text
initial scaffold
```

## Purpose

Prevent stale, partial, or unrelated proof artifacts from supporting current release or capability claims.

## Core Principle

Evidence is trustworthy only when:

```text
it is correlated to the exact build/runtime state being claimed
```

## Required Freshness Properties

- build correlation
- commit correlation
- branch correlation
- validator replay after mutation
- deployment correlation
- release packet correlation
- expiration/TTL rules
- environment correlation

## Required Questions

1. Can old artifacts satisfy fresh claims?
2. Can one branch reuse another branch's evidence?
3. Can repaired builds reuse pre-repair evidence?
4. Can preview evidence be mistaken for production evidence?
5. Are screenshots/videos tied to runtime identifiers?
6. Are release packets immutable?
7. Are generated-app proofs tied to exported artifacts?

## Required Evidence Fields

Every proof artifact should eventually include:

```text
commit SHA
build ID
validator ID
runtime environment
tenant/project correlation
generated-app correlation
timestamp
repair-attempt correlation
release packet ID
```

## Initial Risks

### PFG-001 — stale proof reuse risk

Severity:

```text
P1
```

### PFG-002 — preview/runtime proof confusion risk

Severity:

```text
P1
```

### PFG-003 — release evidence immutability not yet formalized

Severity:

```text
P1
```

## Desired Direction

```text
validator run
-> immutable evidence artifact
-> correlated release packet
-> claim/release gate decision
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| artifact orchestration | GitHub Actions | Codex/Cursor |
| runtime correlation | OpenTelemetry | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |
