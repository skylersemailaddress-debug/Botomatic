# Dirty Repo Evidence Contract (REPO-001)

## What the evidence snapshot is

A **typed, normalized evidence snapshot** for dirty-repo rescue that captures structured findings across intake, audit, and completion planning.

It includes:
- typed entries (`DirtyRepoEvidenceEntry`)
- severity/category/source labels
- optional file path, log excerpt, manifest key, validator id, remediation hint
- derived completion blockers with explicit `evidenceEntryIds`

This lets completion and audit logic reference the same canonical evidence object instead of only free-text heuristics.

## What it is not

- It is **not** runtime execution proof.
- It is **not** a replacement for validators.
- It is **not** a UI redesign artifact.
- It does **not** change legal/launch claims.

## Intake safety: no code execution

Evidence gathering is constrained to static facts only:
- uploaded filenames and metadata
- manifests and structured summaries
- previously validated proof artifacts
- audit/validator outputs already produced by trusted pipeline components

No repository build/test/install commands are executed during intake evidence creation.

## Forward link to REPO-002

REPO-002 (next ticket in dirty-repo lane) can use this contract to evolve completion contract v2 by:
- requiring blocker-to-evidence references
- emitting area/severity rollups into v2 status responses
- standardizing remediation hint generation without changing current route shape
