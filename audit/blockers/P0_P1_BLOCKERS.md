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
pending baseline execution
```

---

# Required Fields

Each blocker should eventually contain:

```text
id
severity
category
summary
runtime truth
commercial impact
security impact
claim impact
evidence path
temporary mitigation
required remediation
recommended owner/model
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