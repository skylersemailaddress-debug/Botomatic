# Build Contract Schema Audit

## Status

```text
initial audit
```

## Purpose

Define what the Build Contract schema must represent before autonomous execution begins.

## Required Schema Domains

| Domain | Required Data |
|---|---|
| user intent | plain-language requested outcome |
| product scope | app type, audience, features |
| assumptions | inferred decisions and confidence |
| constraints | technical, legal, commercial, deployment constraints |
| risks | risky features, unsafe ambiguity, missing credentials |
| approvals | explicit user decisions |
| validators | required validation gates |
| deployment | target, readiness, env requirements |
| evidence | proof requirements and release packet links |
| mutation rules | what Botomatic may edit automatically |

## Required Questions

1. Does the schema represent user-facing intent?
2. Does it represent machine-executable requirements?
3. Does it capture assumptions separately from approved facts?
4. Does it capture risk and approval state?
5. Does it link validators to contract requirements?
6. Does it control deployment/export eligibility?
7. Does it support mutation audit history?

## Initial Risks

### BCS-001 — schema completeness risk

Severity:

```text
P1
```

The contract must be rich enough to drive validators and execution safely.

### BCS-002 — user/machine contract mismatch risk

Severity:

```text
P1
```

The plain-English contract and machine contract must remain synchronized.

### BCS-003 — deployment/readiness fields missing risk

Severity:

```text
P1
```

Launch/export should depend on explicit contract readiness requirements.

## Desired Direction

```text
plain-English contract
+
machine-readable contract
+
approval ledger
+
validator linkage
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| schema/governance reasoning | GPT-5.5 | Claude Opus |
| schema implementation | Codex/Cursor | Zod/JSON Schema |
| UX language | GPT-5.5 | Gemini |
| runtime validation | Vitest/Playwright | Codex/Cursor |
