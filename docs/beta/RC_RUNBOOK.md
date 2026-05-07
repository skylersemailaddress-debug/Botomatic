# Friends-and-Family Beta Release-Candidate Runbook

This runbook defines the final release-candidate gate for opening a private commercial friends-and-family beta of Botomatic.

## Single command

Run the complete gate from the repository root:

```bash
npm run beta:rc
```

The command writes the final report to:

```text
release-evidence/runtime/friends_family_beta_rc.json
```

## What the gate runs

`npm run beta:rc` executes these checks in order and records each exit code, start time, finish time, duration, and output tail in the final JSON report:

1. Dependency/install sanity via `npm run deps:sanity`.
2. Production build via `npm run build`.
3. Test suite via `npm run test`.
4. Repository lint via `npm run lint`.
5. TypeScript typecheck via `npm run typecheck`.
6. Full validator suite via `npm run validate:all`.
7. Friends-and-family beta readiness gate via `npm run beta:readiness`.

## Go/no-go policy

The release candidate is **go** only when every required command exits with code `0`, every required proof artifact exists and passes final validation, and every required beta document is present.

The release candidate is **no-go** when any blocker is present, including:

- Any command exits non-zero.
- Any required proof artifact is missing or unparseable.
- Any required proof signal is missing, false, skipped, or not run.
- Any proof artifact is only locally scoped out rather than a live passing proof.
- Any artifact contains an explicit fake, fabricated, or placeholder proof marker.
- Any required beta document is missing or lacks the expected release-candidate content.

The gate intentionally fails closed: absence of evidence is a blocker, and the RC report must not convert missing or generated fake proof into a pass.

## Required proof artifacts

The final RC gate summarizes these proof artifacts:

- `release-evidence/runtime/tenant_isolation_proof.json`
- `release-evidence/runtime/security_auth_beta_proof.json`
- `release-evidence/runtime/no_secrets_beta_proof.json`
- `release-evidence/runtime/orchestration_core_beta_proof.json`
- `release-evidence/runtime/durable_fail_closed_beta_proof.json`
- `release-evidence/runtime/deployment_smoke_beta_proof.json`
- `release-evidence/runtime/beta_readiness_gate.json`

## Required documents

The final RC gate summarizes these beta documents:

- `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md`
- `docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md`
- `docs/beta/RC_RUNBOOK.md`

## Interpreting the JSON report

Open `release-evidence/runtime/friends_family_beta_rc.json` after every run. The important fields are:

- `timestamp`: when the RC run started.
- `gitSha`: the exact commit under validation.
- `branch`: the branch under validation.
- `commandResults`: ordered command evidence and exit status.
- `proofArtifactSummary`: required proof artifact presence, parseability, signal status, and fake-proof detection.
- `docsSummary`: required document presence and content checks.
- `finalDecision`: `go` or `no-go`.
- `noGoReasons`: explicit blockers to clear before beta access can open.

If `finalDecision` is `no-go`, do not open friends-and-family beta access until every listed reason is resolved and a fresh `npm run beta:rc` returns zero.
