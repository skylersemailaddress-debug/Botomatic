# Baseline Results

## Status

```text
executed with one failing gate
```

## Baseline Branch

```text
phase-1-baseline-repo-truth-audit
```

## Evidence Source

```text
GitHub Actions run: 25572214681
Artifact: phase-1-baseline-evidence
Artifact ID: 6885950386
```

## Command Results

| Order | Command | Status | Evidence Path | Notes |
|---:|---|---|---|---|
| 1 | `npm ci` | PASS | `audit/baseline/logs/01-npm-ci.log` | dependency install passed |
| 2 | `npm run deps:sanity` | PASS | `audit/baseline/logs/02-deps-sanity.log` | dependency sanity passed |
| 3 | `npm run lint` | PASS | `audit/baseline/logs/03-lint.log` | repo lint passed |
| 4 | `npm run typecheck` | PASS | `audit/baseline/logs/04-typecheck.log` | TypeScript passed |
| 5 | `npm run build` | PASS | `audit/baseline/logs/05-build.log` | build passed |
| 6 | `npm run test` | PASS | `audit/baseline/logs/06-test.log` | root tests passed |
| 7 | `npm run validate:all` | PASS | `audit/baseline/logs/07-validate-all.log` | validator suite passed |
| 8 | `npm run proof:all` | FAIL | `audit/baseline/logs/08-proof-all.log` | requires local-memory fallback env when executed in baseline CI |
| 9 | `npm run beta:readiness` | PASS | `audit/baseline/logs/09-beta-readiness.log` | beta readiness passed |
| 10 | `npm run validate:commercial-launch` | PASS | `audit/baseline/logs/10-commercial-launch.log` | commercial launch gate passed |

## Failure Detail

`npm run proof:all` failed with:

```text
BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK=true is required for local development memory repository mode
```

## Summary

The repository baseline is mostly green, but Phase 1 cannot close while `proof:all` fails in the baseline workflow. This is classified as a P0 proof-suite execution blocker because the proof aggregator is a launch-critical gate.

## Initial Interpretation

This does not currently indicate a product build/test/typecheck failure. It indicates the proof suite requires an explicit environment decision for local-memory fallback in CI. The correct fix is to make the proof environment explicit and fail-closed by mode, not to bypass the proof suite.

## Phase 1 Rule

No remediation beyond targeted proof-environment correction begins until this baseline table is completed and failures are classified.