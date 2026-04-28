# Botomatic Build Discipline

This document defines the mandatory operating discipline for Botomatic work.

## Authority and Roles
- GitHub `main` is the source of truth for repository state.
- ChatGPT defines and audits tickets for scope, safety, and claim boundaries.
- Codex implements scoped pull requests mapped to approved tickets.
- Codespaces verifies runtime and UI behavior before merge decisions.
- GitHub Actions enforces required checks and blocks bad merges.

## Scope and Execution Rules
- No broad “make it perfect” tasks; all work must be issue-scoped and reviewable.
- No stale branch wholesale merges.
- No fake launch claims.
- No proof generation as a substitute for runtime correctness.

## Required PR Behavior
- Every PR must be tightly scoped to explicit issue intent.
- Validation evidence must be command-based and reproducible.
- UI-impacting changes must include route-true screenshot evidence.
- Generated-app-impacting changes must include generated-output validation evidence.

## Prohibited Shortcuts
- Do not bypass validators to make checks pass.
- Do not use placeholder production paths.
- Do not claim readiness or launch posture without bounded evidence.
