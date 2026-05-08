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
1 active P0 blocker identified during baseline execution
```

---

# Active Blockers

## P0-001 — proof:all baseline execution failure

### Category

```text
proof-suite / environment-governance
```

### Runtime Truth

`npm run proof:all` fails during GitHub Actions baseline execution.

### Evidence

```text
GitHub Actions run: 25572214681
Artifact: phase-1-baseline-evidence
Log: audit/baseline/logs/08-proof-all.log
```

### Failure

```text
BOTOMATIC_ALLOW_LOCAL_MEMORY_FALLBACK=true is required for local development memory repository mode
```

### Commercial Impact

The proof aggregation suite cannot currently execute cleanly in the baseline CI environment. Because `proof:all` is a launch-critical gate, Phase 1 cannot close while this remains unresolved.

### Security / Reliability Impact

The current proof behavior suggests local-memory fallback behavior is environment-sensitive and not yet governed explicitly enough for deterministic CI proof execution.

### Claim Impact

Commercial launch proof cannot be considered fully runtime-proven while the proof suite fails in baseline CI.

### Required Remediation

- explicitly define proof runtime mode in CI
- fail closed when memory fallback is not intentionally allowed
- separate local-development proof assumptions from CI/commercial proof assumptions
- preserve runtime proof integrity

### Recommended Owner/Model

```text
Primary reasoning: GPT-5.5
Implementation: Codex/Cursor
Large cleanup/refactor if needed: Claude Opus
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