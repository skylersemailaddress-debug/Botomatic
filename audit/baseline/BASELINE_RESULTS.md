# Baseline Results

## Status

```text
executed successfully
```

## Baseline Branch

```text
phase-1-baseline-repo-truth-audit
```

## Evidence Source

```text
GitHub Actions run: 25578934957
Workflow: Phase 1 Baseline Truth Audit #8
Artifact: phase-1-baseline-evidence
Commit: 234ba04
Result: SUCCESS
Duration: 2m 10s
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
| 8 | `npm run proof:baseline` | PASS | `audit/baseline/logs/08-proof-baseline.log` | baseline proof tier passed |
| 9 | `npm run beta:readiness` | PASS | `audit/baseline/logs/09-beta-readiness.log` | beta readiness passed |
| 10 | `npm run validate:commercial-launch` | PASS | `audit/baseline/logs/10-commercial-launch.log` | commercial launch gate passed |

## Summary

Phase 1 baseline is green. The baseline audit now validates core repo health without conflating baseline integrity with commercial runtime proof or max-power / 99% proof claims.

## Proof Tiering Result

`proof:all` was intentionally split into evidence tiers:

```text
proof:baseline
proof:commercial
proof:max-power
proof:all
```

Phase 1 uses `proof:baseline`. Commercial release and max-power capability claims are audited separately.

## Initial Interpretation

Botomatic's core baseline health is strong. The repo currently passes dependency, lint, typecheck, build, test, validation, baseline proof, beta readiness, and commercial launch-stage checks under the Phase 1 baseline workflow.

Remaining Phase 1 work should focus on workflow inventory/cleanup and deeper truth audits for commercial, security, UX, architecture, and validator quality.

## Phase 1 Rule

No broad remediation should begin until workflow cleanup and audit classification are complete.
