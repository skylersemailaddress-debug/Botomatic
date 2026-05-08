# Baseline Results

## Status

```text
pending execution
```

## Baseline Branch

```text
phase-1-baseline-repo-truth-audit
```

## Command Results

| Order | Command | Status | Evidence Path | Notes |
|---:|---|---|---|---|
| 1 | `npm ci` | pending | `audit/baseline/logs/01-npm-ci.log` | dependency install truth |
| 2 | `npm run deps:sanity` | pending | `audit/baseline/logs/02-deps-sanity.log` | dependency reproducibility sanity |
| 3 | `npm run lint` | pending | `audit/baseline/logs/03-lint.log` | repo lint truth |
| 4 | `npm run typecheck` | pending | `audit/baseline/logs/04-typecheck.log` | TypeScript truth |
| 5 | `npm run build` | pending | `audit/baseline/logs/05-build.log` | build truth |
| 6 | `npm run test` | pending | `audit/baseline/logs/06-test.log` | root test truth |
| 7 | `npm run validate:all` | pending | `audit/baseline/logs/07-validate-all.log` | validator suite truth |
| 8 | `npm run proof:all` | pending | `audit/baseline/logs/08-proof-all.log` | proof suite truth |
| 9 | `npm run beta:readiness` | pending | `audit/baseline/logs/09-beta-readiness.log` | beta readiness truth |
| 10 | `npm run validate:commercial-launch` | pending | `audit/baseline/logs/10-commercial-launch.log` | commercial launch gate truth |

## Summary

To be completed after command execution.

## Initial Interpretation

To be completed after command execution.

## Phase 1 Rule

No remediation begins until this baseline table is completed and failures are classified.