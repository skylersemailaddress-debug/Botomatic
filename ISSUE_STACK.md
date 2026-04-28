# Issue Stack

## Active Operating Baseline
- OPS-001 is complete in baseline (`main`).
- OPS-002 is complete: branch protection and required automated checks.
- OPS-003 is complete: stable required PR gate aggregator.
- VALIDATION-001 is complete: `validate:all` baseline cleanup and strict readiness gate promotion.
- LEGAL-001 is complete: claim-boundary docs.
- LEGAL-002 is complete: claim-boundary validator.
- UI-001 is complete: screenshot-true Vibe dashboard.
- UI-002 is complete: screenshot-true Pro dashboard.
- UI-003 is complete: visible mode-toggle UX removed.
- UI-004 is complete: UI route regression tests.
- GEN-001 is complete: UI blueprint registry foundation.
- GEN-002 is complete: generated UI preview engine.
- GEN-003 is complete: generated-app no-placeholder validator.
- GEN-004 is complete: generated-app commercial readiness gate.
- GEN-005 is complete: generated app corpus harness and readiness reassessment.
- GEN-006 is complete: representative generated app fixture batch.

## Ordered Priority Stack
1. OPS-001 freeze random merging (complete)
2. OPS-002 branch protection and required checks (complete)
3. VALIDATION-001 close current `validate:all` baseline failures and promote strict readiness gate to required (complete)
4. LEGAL-001 claim-boundary docs (complete)
5. OPS-003 add stable required PR gate aggregator (complete)
6. LEGAL-002 claim-boundary validator (complete)
7. UI-001 screenshot-true Vibe dashboard (complete)
8. UI-002 screenshot-true Pro dashboard (complete)
9. UI-003 remove visible mode-toggle UX (complete)
10. UI-004 UI regression tests (complete)
11. GEN-001 UI blueprint registry (complete)
12. GEN-002 generated UI preview engine (complete)
13. GEN-003 no-placeholder generated-app validator (complete)
14. GEN-004 generated-app commercial readiness gate (complete)
15. GEN-005 generated app corpus harness and readiness reassessment (complete)
16. GEN-006 representative generated app fixture batch (complete)
17. REPO-001 dirty repo evidence contract (recommended parallel lane)
18. SELF-001 executable self-upgrade safety contract (recommended parallel lane)
19. DEPLOY-001 secret leak prevention and secret-reference policy scope (recommended parallel lane)

## Stale PR Handling Guidance
- PR #71 merged baseline.
- PR #72 is stale/duplicate; do not merge wholesale.
- PR #75 is closed/unmerged dual-mode UI; salvage only via a fresh scoped UI ticket if needed.
- PR #76 is closed/unmerged dark dashboard; salvage only compatible styling ideas if needed.
- PR #78 and #79 merged salvage baseline.
- PR #80 and #81 merged current baseline.
- Future work starts from current `main`.


## Next Recommended Parallel Lane Execution
- REPO-001 dirty repo evidence contract
- SELF-001 executable self-upgrade safety contract
- DEPLOY-001 secret leak prevention and secret-reference policy scope
