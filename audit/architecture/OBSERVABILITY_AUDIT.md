# Observability Audit

## Status

```text
initial audit
```

## Purpose

Determine whether Botomatic can support enterprise-grade observability, debugging, failure classification, and operational trust.

## Required Observability Properties

- structured logs
- traceable execution lifecycle
- job correlation IDs
- tenant/project correlation
- repair-loop visibility
- validator/proof visibility
- deployment visibility
- rollback visibility
- alerting and incident hooks

## Required Questions

1. Can every autonomous execution be traced?
2. Can every validator/proof result be correlated to a build?
3. Are failures classified consistently?
4. Can support/admin operators inspect execution safely?
5. Are deployment failures observable?
6. Are repair loops observable and bounded?
7. Is release evidence durable and queryable?
8. Can generated-app runtime failures be separated from Botomatic failures?

## Initial Risks

### OA-001 — observability boundaries not yet formally mapped

Severity:

```text
P1
```

Commercial launch requires durable operational visibility.

### OA-002 — proof/evidence correlation model not yet verified

Severity:

```text
P1
```

Validators, proofs, releases, and deployments require shared evidence linkage.

### OA-003 — support/operator tooling boundaries not yet audited

Severity:

```text
P1
```

Operational trust depends on safe support visibility.

## Desired Direction

```text
execution
-> correlated logs
-> correlated validators
-> correlated proofs
-> correlated deployment events
-> correlated release evidence
```

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| observability reasoning | GPT-5.5 | Claude Opus |
| runtime instrumentation | OpenTelemetry | Codex/Cursor |
| alerting/incident tooling | Sentry | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |

## Required Next Evidence

- execution correlation map
- logging architecture map
- proof/evidence correlation map
- deployment observability map
- operator tooling map
