# Orchestration Observability Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether autonomous execution is observable enough for debugging, support, reliability, and enterprise trust.

## Required Observability Properties

- correlated job IDs
- correlated Build Contract IDs
- correlated tenant/project IDs
- execution step traces
- validator result traces
- repair attempt traces
- rollback/recovery traces
- deployment traces
- user-visible status mapping
- operator-visible diagnostics

## Required Questions

1. Can every autonomous action be traced?
2. Can every validator result be linked to the job that produced it?
3. Can repair attempts be linked to original failures?
4. Can rollback/recovery events be audited?
5. Can users see plain-English progress?
6. Can operators see technical diagnostics?
7. Can observability distinguish Botomatic failure from generated-app failure?
8. Are traces safe for multi-tenant/commercial use?

## Initial Risks

### OOA-001 — trace correlation gap

Severity:

```text
P1
```

Enterprise systems require end-to-end correlation across jobs, validators, repairs, and evidence.

### OOA-002 — user/operator status mismatch

Severity:

```text
P1
```

User-facing status and operator-facing diagnostics must reflect the same underlying state.

### OOA-003 — generated-app failure attribution risk

Severity:

```text
P1
```

Botomatic must distinguish core-system failures from generated-app failures.

## Desired Direction

```text
execution event
-> trace/correlation ID
-> validator evidence
-> user status
-> operator diagnostics
-> release evidence
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| observability reasoning | GPT-5.5 | Claude Opus |
| instrumentation | OpenTelemetry | Codex/Cursor |
| incident/error tooling | Sentry | GPT-5.5 |
| runtime testing | Playwright/Vitest | Codex/Cursor |
