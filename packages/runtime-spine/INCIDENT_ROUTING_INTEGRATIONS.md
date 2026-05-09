# Incident Routing Integrations

## Purpose

Define the operational incident-routing integrations for runtime-spine.

## Required Integrations

### PagerDuty

Responsibilities:

- critical runtime escalation
- deployment rollback escalation
- sandbox isolation escalation

---

### Slack

Responsibilities:

- runtime incident notifications
- deployment notifications
- rollback notifications
- feature-flag activation notifications

---

### SIEM Export

Responsibilities:

- audit event export
- security incident export
- sandbox violation export
- governance event export

## Required Routing Properties

- tenant-safe metadata
- trace correlation
- deployment correlation
- rollback correlation
- incident ownership attribution

## Required Future Proof Gates

```text
proof:incident-routing
proof:slack-routing
proof:pagerduty-routing
proof:siem-export
proof:tenant-safe-routing
```

## Exit Criteria

Incident routing exits only when:

- routing integrations exist
- escalation paths tested
- tenant-safe routing validated
- rollback escalation validated
