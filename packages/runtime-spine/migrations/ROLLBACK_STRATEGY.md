# Runtime Spine Rollback Strategy

## Purpose

Define rollback safety guarantees for runtime persistence migrations.

## Rollback Principles

- runtime lineage must remain recoverable
- validator evidence must remain auditable
- checkpoints must remain replayable
- rollbacks must never silently destroy orchestration state

## Rollback Order

1. runtime_cancellations
2. runtime_heartbeats
3. runtime_validator_results
4. runtime_checkpoints
5. runtime_jobs

## Rollback Constraints

- runtime_jobs may only rollback after dependent tables are removed
- rollback execution requires orchestration downtime window
- rollback execution requires runtime proof snapshot
- rollback execution requires persistence backup

## Required Backup Assets

Before rollback:

- runtime_jobs export
- runtime_checkpoints export
- runtime_validator_results export
- runtime_heartbeats export
- runtime_cancellations export

## Validation Requirements

Rollback execution must validate:

- no orphaned checkpoint lineage
- no orphaned validator lineage
- no unresolved execution states
- no active distributed worker leases

## Exit Criteria

Rollback governance exits only when:

- automated rollback scripts exist
- rollback validation exists
- persistence recovery proofs exist
