# Deployment Promotion Governance

## Purpose

Define governed promotion rules between runtime environments.

## Promotion Flow

```text
local
-> staging
-> controlled production
-> expanded production
```

## Required Promotion Gates

### Local -> Staging

Requirements:

- proof suite passing
- migrations validated
- observability operational

---

### Staging -> Controlled Production

Requirements:

- operational drills passing
- incident routing operational
- rollback evidence preserved
- deployment replay validated

---

### Controlled Production -> Expanded Production

Requirements:

- SLO compliance stable
- no unresolved rollback incidents
- autoscaling stable
- sandbox governance stable

## Required Governance Controls

- promotion approvals attributable
- deployment evidence immutable
- rollback path required
- production freeze support
- deployment lineage queryable

## Required Promotion Evidence

- proof artifacts
- validator evidence
- deployment metrics
- rollback evidence
- incident evidence

## Exit Criteria

Deployment promotion governance exits only when:

- promotion workflows implemented
- promotion evidence preserved
- rollback drills operational
- deployment lineage queryable
