# Issue Stack

## Active Operating Baseline
- OPS-001 is complete in baseline (`main`).
- OPS-002 is active: branch protection and required automated checks.

## Ordered Priority Stack
1. OPS-001 freeze random merging (complete)
2. OPS-002 branch protection and required checks (active)
3. LEGAL-001 claim-boundary docs
4. LEGAL-002 claim-boundary validator
5. UI-001 screenshot-true Vibe dashboard
6. UI-002 screenshot-true Pro dashboard
7. UI-003 remove visible mode-toggle UX
8. UI-004 UI regression tests
9. GEN-001 UI blueprint registry
10. GEN-002 generated UI preview engine
11. GEN-003 no-placeholder generated-app validator
12. GEN-004 generated-app commercial readiness gate

## Stale PR Handling Guidance
- PR #71 merged baseline.
- PR #72 is stale/duplicate; do not merge wholesale.
- PR #75 is closed/unmerged dual-mode UI; salvage only via a fresh scoped UI ticket if needed.
- PR #76 is closed/unmerged dark dashboard; salvage only compatible styling ideas if needed.
- PR #78 and #79 merged salvage baseline.
- PR #80 and #81 merged current baseline.
- Future work starts from current `main`.
