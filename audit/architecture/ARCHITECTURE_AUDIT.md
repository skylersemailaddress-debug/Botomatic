# Architecture Audit

## Phase

```text
Phase 2 — Repo Structure and Architecture Audit
```

## Purpose

Determine whether Botomatic is organized like a serious autonomous software platform before any broad refactor work begins.

## Current Status

```text
initialized
```

## Primary Questions

1. Is chat intake separated from execution?
2. Is planning separated from code generation/source mutation?
3. Is validation separated from public/commercial claims?
4. Is preview separated from source mutation while preserving sync guarantees?
5. Are generated apps isolated from Botomatic core?
6. Are user projects tenant-scoped?
7. Is there a durable job model?
8. Are validators composable and non-bypassable?
9. Are launch gates evidence-backed?
10. Are commercial systems first-class rather than bolted on?

## Required Artifacts

```text
audit/architecture/REPO_STRUCTURE_SCORECARD.md
audit/architecture/BOUNDARY_VIOLATIONS.md
audit/architecture/DEPENDENCY_GRAPH.md
audit/architecture/REFACTOR_BACKLOG.md
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| architecture reasoning | GPT-5.5 | Claude Opus |
| dependency graph | dependency-cruiser / madge | GPT-5.5 |
| dead code | ts-prune | Codex/Cursor |
| implementation patches | Codex/Cursor | Claude Opus |
| large repetitive refactor | Claude Opus | GPT-5.5 review |

## Non-Goals

- no UI redesign
- no feature expansion
- no launch implementation
- no 99% claim expansion
- no broad refactor before classification

## Findings

Pending repo structure and dependency inspection.
