# Validator Truth Audit

## Purpose

This audit determines whether Botomatic validators and proof runners actually verify runtime reality or merely represent intended behavior.

A green validator without meaningful runtime verification is treated as untrusted until proven otherwise.

---

# Core Principle

Validators are products.

They require:

- architecture review
- negative-path testing
- false-positive analysis
- runtime verification
- CI enforcement
- evidence preservation

---

# Validator Classification Matrix

Each validator should eventually be classified into one or more categories.

| Type | Meaning |
|---|---|
| static | checks files, text, or declarations only |
| structural | checks schema or repository structure |
| runtime | executes real behavior |
| negative-path | proves failure states fail correctly |
| launch-gate | blocks launch claims |
| security | validates security properties |
| deployment | validates deployment/runtime state |
| representative | validates examples but not broad coverage |
| exhaustive | broad domain/runtime coverage |

---

# Required Questions

Every validator must eventually answer:

1. What exactly does it verify?
2. What does it not verify?
3. Can it falsely pass?
4. Does it execute real runtime behavior?
5. Does it test negative paths?
6. Does it depend on placeholder fixtures?
7. Can it pass without meaningful output?
8. Is it wired into CI/release gates?
9. Does commercial launch depend on it?
10. Is evidence preserved?

---

# Required Truth Rules

A validator is not considered launch-trustworthy unless:

- it executes meaningful logic
- it fails when the protected property breaks
- it returns non-zero on failure
- it preserves evidence
- it cannot silently pass placeholder state
- it is referenced by release gates where appropriate

---

# Known High-Risk Validator Areas

The following categories are automatically high-risk and require special scrutiny:

- commercial launch validators
- deployment validators
- tenant isolation validators
- auth/route validators
- secret leak validators
- generated-app readiness validators
- source-sync validators
- proof aggregation runners
- orchestration durability validators
- rollback validators

---

# Model Assignment

## GPT-5.5

Primary responsibility:

- validator truth reasoning
- false-positive analysis
- commercial impact analysis
- launch-gate interpretation

## Codex / Cursor

Primary responsibility:

- validator execution
- negative-path implementation
- test harness generation

## Claude Opus

Primary responsibility:

- repetitive validator cleanup/refactors
- large-scale normalization

---

# Required Outputs

This audit should eventually produce:

```text
validator inventory
validator coverage map
false-pass registry
missing negative-path coverage
placeholder dependency registry
CI enforcement map
launch-gate dependency map
validator hardening backlog
```

---

# Completion Criteria

The validator audit completes only when:

- all launch-critical validators are inventoried
- high-risk validators were reviewed
- false-pass risks were documented
- missing negative-path tests were identified
- placeholder-dependent validators were identified
- launch-critical validators are wired into CI/release gates
- unsupported claims tied to weak validators are documented
