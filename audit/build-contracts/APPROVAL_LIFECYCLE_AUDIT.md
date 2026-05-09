# Approval Lifecycle Audit

## Status

```text
initial audit
```

## Purpose

Ensure meaningful autonomous actions require explicit, understandable, auditable approval states.

## Required Approval Stages

| Stage | Meaning |
|---|---|
| intent acknowledgement | Botomatic confirms understanding |
| assumption review | inferred assumptions reviewed |
| Build Contract approval | scope approved |
| risky-action approval | deployment/security/billing/etc |
| launch/export approval | release decision |
| repair approval | autonomous repair permission |
| rollback approval | recovery/restore decisions |

## Required Questions

1. Which actions require explicit approval?
2. Can approvals be revoked?
3. Can approvals expire after major changes?
4. Can repairs exceed approved scope?
5. Are approvals tied to exact contract versions?
6. Can deployment/export bypass approvals?
7. Are approval decisions explainable to non-technical users?

## Initial Risks

### ALA-001 — stale approval risk

Severity:

```text
P1
```

Approvals may become invalid after major mutations or repairs.

### ALA-002 — hidden risky-action risk

Severity:

```text
P1
```

Users must understand when actions affect deployment, billing, security, or persistence.

### ALA-003 — approval/version mismatch risk

Severity:

```text
P1
```

Approvals must correlate to exact Build Contract state.

## Desired Direction

```text
contract version
-> explicit approval
-> governed execution
-> evidence-linked release
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| UX review | GPT-5.5 | Gemini |
| implementation | Codex/Cursor | Claude Opus |
| runtime verification | Playwright/Vitest | Codex/Cursor |
