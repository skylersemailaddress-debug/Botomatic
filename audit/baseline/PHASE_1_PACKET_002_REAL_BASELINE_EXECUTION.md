# PHASE 1 PACKET 002 — Real Baseline Execution

## Purpose

Execute the complete Botomatic baseline gate suite and preserve real command evidence.

This packet is not remediation. It is truth capture.

---

# Executor Assignment

## Best executor

Use Codex, Cursor agent, GitHub Actions, or a local terminal with the repo checked out.

## Best analyst

Use GPT-5.5 to interpret logs, classify blockers, and map failures to commercial impact.

## Best refactor model after classification

Use Claude Opus for large repetitive code cleanup after Phase 1 is complete.

---

# Required Execution Rules

1. Run commands from a clean checkout of `main` after Phase 0 merge or from this Phase 1 branch if preserving audit artifacts in the same branch.
2. Do not fix failures during this packet.
3. Capture stdout and stderr for every command.
4. Preserve exit code for every command.
5. Mark missing scripts as failures.
6. Do not skip commands because an earlier command failed.
7. Do not claim launch readiness if any P0 blocker remains.

---

# Required Command Suite

```bash
mkdir -p audit/baseline/logs

npm ci > audit/baseline/logs/01-npm-ci.log 2>&1; echo $? > audit/baseline/logs/01-npm-ci.exit
npm run deps:sanity > audit/baseline/logs/02-deps-sanity.log 2>&1; echo $? > audit/baseline/logs/02-deps-sanity.exit
npm run lint > audit/baseline/logs/03-lint.log 2>&1; echo $? > audit/baseline/logs/03-lint.exit
npm run typecheck > audit/baseline/logs/04-typecheck.log 2>&1; echo $? > audit/baseline/logs/04-typecheck.exit
npm run build > audit/baseline/logs/05-build.log 2>&1; echo $? > audit/baseline/logs/05-build.exit
npm run test > audit/baseline/logs/06-test.log 2>&1; echo $? > audit/baseline/logs/06-test.exit
npm run validate:all > audit/baseline/logs/07-validate-all.log 2>&1; echo $? > audit/baseline/logs/07-validate-all.exit
npm run proof:all > audit/baseline/logs/08-proof-all.log 2>&1; echo $? > audit/baseline/logs/08-proof-all.exit
npm run beta:readiness > audit/baseline/logs/09-beta-readiness.log 2>&1; echo $? > audit/baseline/logs/09-beta-readiness.exit
npm run validate:commercial-launch > audit/baseline/logs/10-commercial-launch.log 2>&1; echo $? > audit/baseline/logs/10-commercial-launch.exit
```

---

# Required Summary Script

After execution, create a command status table using the exit files:

```bash
for f in audit/baseline/logs/*.exit; do echo "$f: $(cat $f)"; done
```

---

# Required Evidence Commit

After running the suite, commit:

```text
audit/baseline/logs/*.log
audit/baseline/logs/*.exit
audit/baseline/BASELINE_RESULTS.md
audit/baseline/FAILED_GATES.md
audit/baseline/MISSING_SCRIPTS.md
audit/blockers/P0_P1_BLOCKERS.md
```

---

# Analysis Instructions

For each non-zero exit code, determine:

```text
root command
first failing subcommand
first meaningful error
whether failure is deterministic
whether failure is script-missing, dependency, type, build, test, validator, runtime, environment, or claim-gate related
commercial impact
security impact
claim impact
severity
recommended owner/model
```

---

# Severity Defaults

| Failure | Default Severity |
|---|---|
| `npm ci` fails | P0 |
| `lint` fails | P1 unless blocking build/release |
| `typecheck` fails | P0 |
| `build` fails | P0 |
| root `test` fails | P0 |
| `validate:all` fails | P0 |
| `proof:all` fails | P0 |
| `beta:readiness` fails | P0 |
| `validate:commercial-launch` fails | P0 |
| missing required script | P0 or P1 depending on launch relevance |

---

# Completion Criteria

This packet is complete when:

- every baseline command has a log file
- every baseline command has an exit-code file
- BASELINE_RESULTS.md is updated with pass/fail status
- FAILED_GATES.md lists every failing gate
- MISSING_SCRIPTS.md lists every missing/invalid script
- P0_P1_BLOCKERS.md contains the first blocker registry
- no remediation has been mixed into this packet
