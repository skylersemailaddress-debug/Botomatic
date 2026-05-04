# SPEC-LOCK → BUILD Audit Receipt

## Summary

The SPEC-LOCK → BUILD enforcement audit has been implemented. High-risk decisions (auth, payments, database, external integrations, compliance) are now blocked from auto-approval during the spec intake flow.

## Changes Applied

### `getBuildBlockers()` — Intake path vs. normal path
- Intake path: runs full `computeBuildBlockStatus` + `canAutoApprove` checks; high-risk decisions block
- Normal path: uses `canAutoApprove` as primary gate (preserves existing test behavior)

### `compileProjectWithIntake()` — Conditional assumption approval
- Low-risk assumptions: always auto-approved
- High-risk assumptions: only approved if already explicitly approved
- Security/auth/payment/compliance `openQuestions` preserved through intake
- `readyToBuild` conditioned on `!hasUnresolvedHighRisk`

### `identifyHighRiskDecisions()` — Fixed for masterTruth spec shape
- Uses `spec.request || spec.coreValue || ''` (masterTruth uses `coreValue` not `request`)
- Removed `auth_unspecified` check (always fires on masterTruth which has no `authModel`)
- Added object guard before checking `assumption.risk`

### `build_blocked` response enriched
- Now includes `spec`, `assumptions`, and `questions` payload in the response body

## Claim

HIGH_RISK_ASSUMPTIONS and open security questions are no longer silently bypassed during intake uploads. The spec-lock contract is enforced at the build gate.
