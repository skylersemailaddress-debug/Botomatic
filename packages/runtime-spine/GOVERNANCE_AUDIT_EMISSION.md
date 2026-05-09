# Governance Audit Emission

## Purpose

Define how runtime-spine emits governance audit events for policy evaluation, activation, deployment, rollback, and incident workflows.

## Required Audit Event Domains

### Policy Evaluation Events

- policy evaluated
- policy allowed
- policy blocked
- policy escalated

---

### Activation Events

- activation requested
- activation approved
- activation blocked
- activation rolled back

---

### Deployment Events

- deployment requested
- deployment promoted
- deployment frozen
- deployment rolled back

---

### Evidence Events

- evidence captured
- evidence archived
- evidence export requested
- evidence retention violation

## Required Event Properties

- event_id
- trace_id
- tenant_id
- project_id
- actor_id
- event_type
- event_payload
- created_at

## Required Future Components

- audit event emitter
- immutable audit sink
- evidence archive forwarder
- policy violation emitter

## Exit Criteria

Governance audit emission exits only when:

- audit event schema exists
- audit emitter exists
- immutable sink exists
- policy violation events are queryable
