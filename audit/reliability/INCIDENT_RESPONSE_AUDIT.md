# Incident Response Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic can classify, diagnose, escalate, mitigate, and recover from incidents in a commercially reliable manner.

## Required Incident Properties

- severity classification
- tenant-impact classification
- escalation procedures
- rollback procedures
- incident timelines
- postmortem governance
- observability correlation
- support escalation paths
- communication governance
- evidence preservation

## Required Questions

1. Are incident severities standardized?
2. Can incidents be diagnosed rapidly?
3. Are rollback/recovery procedures documented?
4. Are support escalation paths defined?
5. Can generated-app incidents be separated from platform incidents?
6. Are postmortems actionable and auditable?
7. Are incident communications attributable and consistent?
8. Are reliability metrics tied to incidents?

## Initial Risks

### IRA-001 — incident classification ambiguity risk

Severity:

```text
P1
```

Commercial systems require deterministic severity classification.

### IRA-002 — rollback coordination risk

Severity:

```text
P1
```

Operational recovery requires governed rollback and escalation procedures.

### IRA-003 — platform/generated-app attribution risk

Severity:

```text
P1
```

Support operations must distinguish platform failures from generated-app failures.

## Desired Direction

```text
runtime event
-> classified incident
-> observable diagnostics
-> escalation/rollback
-> postmortem learning
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| incident reasoning | GPT-5.5 | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
| escalation tooling | PagerDuty/Opsgenie | Codex/Cursor |
| runtime validation | Playwright/Vitest | Codex/Cursor |
