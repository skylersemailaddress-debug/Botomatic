# Self-Upgrade Policy

Status: Active

## Required self-upgrade lifecycle

1. Generate `SelfUpgradeSpec` from chat request.
2. Map affected files and modules.
3. Check `ARCHITECTURE_CONSTITUTION.md` constraints.
4. Execute PR-sized change on non-main branch.
5. Run targeted validators.
6. Run regression validators.
7. Record evidence in proof ledger.
8. Produce rollback instructions.
9. Require human approval for merge/deployment.

## Hard prohibitions

- Do not disable validators to pass.
- Do not lower thresholds silently.
- Do not silently broaden or narrow product scope.
- Do not claim completion without proof.

## Completion requirements

Self-upgrade is complete only when:
- code changes are committed on branch/PR
- validator outputs are recorded
- drift/regression checks are recorded
- rollback steps are documented
- proof ledger entry exists
