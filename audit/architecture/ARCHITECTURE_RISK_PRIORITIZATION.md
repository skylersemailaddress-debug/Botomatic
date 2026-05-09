# Architecture Risk Prioritization

## Phase

```text
Phase 2 — Repo Structure and Architecture Audit
```

## Purpose

Prioritize architecture risks by commercial launch impact rather than aesthetics.

## Priority Rules

| Priority | Meaning |
|---|---|
| P0 | blocks commercial trust or safe multi-tenant operation |
| P1 | major launch/commercial/runtime risk |
| P2 | important scalability or maintainability concern |
| P3 | cleanup/hygiene |

## P0 Risks

### AR-P0-001 — tenant isolation not fully source-verified

Source:

```text
audit/architecture/TENANT_ISOLATION_AUDIT.md
```

Impact:

Commercial multi-tenant launch cannot proceed until tenant/project/workspace/credential/evidence isolation is proven.

Next Phase Owner:

```text
Phase 8 — Security and Tenant Isolation Hardening
```

Primary Tools:

```text
GPT-5.5, Semgrep, CodeQL, Playwright/Vitest, Codex/Cursor
```

## P1 Risks

### AR-P1-001 — validator ownership concentration

Source:

```text
audit/architecture/VALIDATOR_OWNERSHIP_AUDIT.md
```

Impact:

Commercial claims may depend on validators whose ownership, negative-path behavior, or evidence production is not yet clearly separated.

Next Phase Owner:

```text
Phase 3 — Validator Truth Audit
```

### AR-P1-002 — Build Contract lifecycle not source-mapped

Source:

```text
audit/architecture/BUILD_CONTRACT_AUDIT.md
```

Impact:

Conversational intent could outrun governed execution unless Build Contract creation, approval, mutation, and enforcement are formally mapped.

Next Phase Owner:

```text
Phase 5 — Build Contract System Completion
```

### AR-P1-003 — orchestration lifecycle boundaries incomplete

Source:

```text
audit/architecture/ORCHESTRATION_BOUNDARY_AUDIT.md
```

Impact:

Autonomous planner/executor/repair/deployment flow requires durable, observable, and restart-safe boundaries.

Next Phase Owner:

```text
Phase 6 — Autonomous Builder Engine Audit and Hardening
```

### AR-P1-004 — observability boundary incomplete

Source:

```text
audit/architecture/OBSERVABILITY_AUDIT.md
```

Impact:

Commercial support, failure diagnosis, and enterprise readiness require correlated logs/traces/evidence.

Next Phase Owner:

```text
Phase 11 — Reliability, Failure Modes, and Observability
```

### AR-P1-005 — generated-app isolation requires deeper proof

Source:

```text
audit/architecture/GENERATED_APP_ISOLATION_AUDIT.md
```

Impact:

Generated apps must remain portable and independently launchable without hidden Botomatic runtime coupling.

Next Phase Owner:

```text
Phase 9 — Generated App Commercial Readiness
```

## P2 Risks

### AR-P2-001 — root script surface sprawl

Source:

```text
audit/architecture/BOUNDARY_VIOLATIONS.md
audit/architecture/REFACTOR_BACKLOG.md
```

Impact:

Operational commands are hard to govern and discover.

Next Phase Owner:

```text
Phase 12 — CI/CD and Release Gate Hardening
```

### AR-P2-002 — app-like service classification incomplete

Source:

```text
audit/architecture/BOUNDARY_VIOLATIONS.md
```

Impact:

Unclassified runtime services can drift into production without governance.

Next Phase Owner:

```text
Phase 2 follow-up or Phase 6
```

## Execution Order

1. Phase 3 validator truth audit
2. Phase 5 Build Contract completion
3. Phase 6 engine/orchestration hardening
4. Phase 8 tenant/security hardening
5. Phase 9 generated-app readiness
6. Phase 11 observability/reliability
7. Phase 12 CI/CD release gates

## Tool / Model Ownership

| Risk Class | Primary | Secondary |
|---|---|---|
| architecture interpretation | GPT-5.5 | Claude Opus |
| validator truth | GPT-5.5 + Codex/Cursor | StrykerJS |
| package decomposition | Claude Opus | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |
| security | Semgrep/CodeQL | GPT-5.5 |
| runtime proof | Playwright/Vitest | Codex/Cursor |
