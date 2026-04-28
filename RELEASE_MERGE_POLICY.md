# Release Merge Policy

This policy governs what may be merged into `main`.

## Baseline and Issue Mapping
- `main` is the baseline branch.
- Every PR must map to exactly one issue.

## Forbidden Merge Patterns
- No merging stale duplicate branches.
- No merging old UI branches wholesale.
- No validator weakening.
- No launch claim expansion without evidence.

## Evidence Requirements by PR Type
- UI PRs require route checks and screenshot proof.
- Generated-app PRs require generated-output validation.
- Self-upgrade PRs require drift and regression proof.

## Approval and Merge Control
- Human approval is required before merge.
- Automated systems may assist checks, but may not replace explicit reviewer approval.
