# Tool Selection Governance

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic selects tools, runtimes, frameworks, and execution strategies in a governed and explainable manner.

## Required Governance Properties

- tool selection linked to Build Contract
- tool selection linked to constraints
- tool selection linked to validator requirements
- explainable framework/runtime choices
- safe fallback handling
- unsupported-tool detection
- replayable tool-selection traces
- confidence-linked recommendations

## Required Questions

1. Why was a specific tool/framework selected?
2. Can tool selection drift unpredictably?
3. Can unsupported tools enter execution?
4. Are framework/runtime choices explainable to users/operators?
5. Can repairs silently swap technologies?
6. Are generated-app requirements linked to tool choice?
7. Can tool selection bypass validator or security requirements?

## Initial Risks

### TSG-001 — opaque tool-selection risk

Severity:

```text
P1
```

Autonomous systems require explainable framework/runtime selection.

### TSG-002 — repair-induced technology drift risk

Severity:

```text
P1
```

Repair systems must not silently mutate architecture direction.

### TSG-003 — unsupported-runtime execution risk

Severity:

```text
P1
```

Unsupported tools/runtimes must be blocked before execution.

## Desired Direction

```text
Build Contract
-> governed tool selection
-> validator-linked execution
-> evidence-backed readiness
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| governance reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime validation | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
