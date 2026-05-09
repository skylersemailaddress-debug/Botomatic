# UX Friction Audit

## Status

```text
initial audit
```

## Purpose

Identify friction that prevents non-technical users from successfully using Botomatic without understanding engineering internals.

## Friction Categories

| Category | Risk |
|---|---|
| technical language | user cannot understand status/blockers |
| hidden assumptions | user does not know what Botomatic inferred |
| unclear approvals | user approves actions without understanding impact |
| fake progress | user sees progress without real evidence |
| forced technical decisions | user must choose repos/env vars/CI/CD unexpectedly |
| unclear failure recovery | user does not know how to proceed after failure |
| advanced-mode leakage | expert controls pollute default path |
| launch ambiguity | user cannot tell what is safe to launch |

## Initial Findings

### UXF-001 — technical system concepts must stay optional

Severity:

```text
P1
```

Botomatic's audit and engineering system includes many necessary technical concepts, but the product UX must hide these from the default user path.

### UXF-002 — readiness must be evidence-backed but plain-English

Severity:

```text
P1
```

Users should not need to understand validators, proof tiers, or CI artifacts to know whether an app is ready.

### UXF-003 — blocker explanations require user-action mapping

Severity:

```text
P1
```

Every blocker should answer:

```text
what happened
why it matters
what Botomatic can do
what the user must decide
```

## Required UX Direction

```text
technical truth under the hood
plain-English trust surface for the user
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| visual review | Gemini | Playwright screenshots |
| implementation | Codex/Cursor | Claude Opus |
| a11y | axe-core | Lighthouse |
