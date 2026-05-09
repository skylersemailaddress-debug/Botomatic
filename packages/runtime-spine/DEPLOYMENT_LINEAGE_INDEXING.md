# Deployment Lineage Indexing

## Purpose

Define how deployment, rollout, validator, and rollback lineage remain queryable across runtime-spine operations.

## Required Index Domains

### Deployment Lineage

Indexes:

- deployment_id
- trace_id
- tenant_id
- project_id
- release_version
- environment

---

### Rollout Lineage

Indexes:

- rollout_id
- rollout_stage
- deployment_id
- rollback_id
- execution_status

---

### Validator Lineage

Indexes:

- validator_id
- validator_result
- replay_attempt
- release_gate
- trace_id

---

### Incident Lineage

Indexes:

- incident_id
- escalation_status
- PagerDuty_reference
- Slack_reference
- rollback_reference

## Required Query Properties

- trace-correlated
- replayable
- attributable
- retention-aware
- exportable

## Required Future Storage

- deployment evidence index
- validator evidence index
- incident evidence index
- rollback evidence index

## Exit Criteria

Deployment lineage indexing exits only when:

- lineage schema exists
- lineage query API exists
- lineage retention policy exists
- lineage export support exists
