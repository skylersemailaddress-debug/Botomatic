# Architecture Constitution

Status: Active
Purpose: Prevent uncontrolled drift while Botomatic self-upgrades.

## Core constitutional rules

- Chat is the primary control surface.
- No user-facing mode buttons are allowed.
- Control-plane governance, audit, and validation gates cannot be bypassed.
- Build and execution must fail closed when spec/build contract gates are not satisfied.
- Validator quality thresholds cannot be lowered without explicit human approval.
- No launch-ready claim is valid without validator-backed proof.

## Self-upgrade constitutional rules

- Never mutate `main` directly.
- Self-upgrade changes must be branch or PR scoped.
- Every self-upgrade starts with a `SelfUpgradeSpec`.
- Affected modules must be mapped before edits.
- Regression validators must run before completion claims.
- Rollback instructions must be present for each self-upgrade.
- Human approval is required before merge or production deployment.

## Source-of-truth ordering

1. Repository code and validator output
2. Proof ledger and runtime evidence
3. Memory artifacts
4. Chat history

Memory must never override current repository truth.
