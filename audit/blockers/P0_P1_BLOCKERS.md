# P0 / P1 Blockers

## Purpose

This registry tracks launch-blocking and enterprise-critical weaknesses discovered during Phase 1 baseline truth audit.

A blocker is not merely a bug. It is a condition that prevents Botomatic from honestly claiming Google-level commercial readiness.

---

# Severity Definitions

## P0

Commercial launch blocker.

Examples:

- failing root tests
- broken validator suites
- missing tenant isolation proof
- unsafe auth bypasses
- fake deployment proof
- missing rollback proof
- broken orchestration durability
- secret leakage
- cross-tenant access
- launch claims without evidence

## P1

Major enterprise/commercial risk.

Examples:

- incomplete observability
- weak admin/support tooling
- partial validator coverage
- inconsistent route protection
- incomplete billing enforcement
- fragile restart/resume
- poor non-technical-user UX

---

# Current Status

```text
No active P0 blockers currently identified during Phase 1 baseline execution.
```

---

# Resolved Blockers

## RESOLVED-P0-001 — proof aggregation tiering failure

### Original Category

```text
proof-suite / environment-governance
```

### Root Cause

`proof:all` incorrectly combined:

- baseline proof
- commercial proof
- deployment/runtime proof
- max-power proof
- 99% claim proof

inside the Phase 1 baseline workflow.

This created false-negative baseline failures unrelated to baseline repo truth.

### Permanent Resolution

Proof execution was reclassified into explicit tiers:

```text
proof:baseline
proof:commercial
proof:max-power
proof:all
```

Phase 1 baseline execution now uses:

```text
npm run proof:baseline
```

Commercial/runtime proof and max-power claim proof are audited in later phases.

### Runtime Evidence

```text
GitHub Actions run: 25578934957
Workflow: Phase 1 Baseline Truth Audit #8
Commit: 234ba04
Result: SUCCESS
```

### Google-Level Interpretation

The correct fix was not bypassing validators.

The correct fix was separating:

- baseline integrity proof
- commercial runtime proof
- future-state / 99% proof

into independently auditable evidence tiers.

### Recommended Tooling Pattern

```text
Architecture reasoning: GPT-5.5
Implementation: Codex/Cursor
Large refactor support: Claude Opus
```

---

# Google-Level Rule

A blocker may not be closed because:

- the UI looks correct
- documentation exists
- a validator was bypassed
- a dry run succeeded
- a happy-path demo succeeded

A blocker closes only when runtime evidence proves the underlying property.
