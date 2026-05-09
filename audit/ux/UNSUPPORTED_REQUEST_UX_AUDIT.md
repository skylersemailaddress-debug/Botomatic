# Unsupported Request UX Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether Botomatic handles unsupported, unsafe, unclear, or impossible requests in a way that preserves user trust.

## Core Principle

Botomatic should fail gracefully when it cannot safely or honestly complete a request.

## Required UX Properties

- explains what cannot be done
- explains why it cannot be done
- offers safe alternatives when possible
- avoids pretending unsupported work succeeded
- avoids technical blame language
- distinguishes unclear vs unsafe vs impossible
- preserves user momentum

## Required Questions

1. Does Botomatic clearly refuse unsupported requests?
2. Does Botomatic avoid fake success states?
3. Are limitations explained plainly?
4. Are safe alternatives offered?
5. Can unsupported requests accidentally enter build execution?
6. Are unsupported deployment targets blocked?
7. Are unsupported feature claims blocked?

## Initial Risks

### URX-001 — impossible request optimism risk

Severity:

```text
P1
```

Autonomous builders can overpromise if unsupported requests are not clearly classified.

### URX-002 — unclear request execution risk

Severity:

```text
P1
```

Vague requests should trigger clarification or safe assumptions before execution.

### URX-003 — unsafe request gating risk

Severity:

```text
P1
```

Unsafe or commercially misleading requests must not proceed into launchable outputs.

## Desired Direction

```text
unsupported request
-> plain explanation
-> safe alternative
-> user-controlled next step
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| request classification reasoning | GPT-5.5 | policy review |
| UX wording | GPT-5.5 | Gemini |
| implementation | Codex/Cursor | Claude Opus |
| flow testing | Playwright | Vitest |
