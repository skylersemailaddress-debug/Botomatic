# Advanced Mode Boundary Audit

## Status

```text
initial audit
```

## Purpose

Ensure advanced/developer-oriented functionality does not compromise the default non-technical user experience.

## Core Principle

Advanced controls should be:

```text
available but optional
```

not:

```text
required for normal successful usage
```

## Required Boundary Properties

- advanced controls hidden by default
- advanced mode opt-in only
- advanced mode clearly labeled
- non-technical path remains complete without advanced mode
- advanced actions require explicit confirmation
- advanced terminology isolated from default UX
- advanced actions remain validator-governed

## Required Questions

1. Can non-technical users complete workflows without advanced mode?
2. Are technical concepts leaking into default UX?
3. Can advanced actions bypass validators?
4. Can advanced mode create unsafe deployments?
5. Can advanced-mode failures corrupt standard workflows?
6. Is mode switching understandable?
7. Are dangerous operations gated?

## Initial Risks

### AMB-001 — engineering-system leakage risk

Severity:

```text
P1
```

Botomatic internally requires many engineering concepts, but these must not dominate the default UX.

### AMB-002 — validator bypass risk

Severity:

```text
P1
```

Advanced controls must not bypass release/truth gates silently.

### AMB-003 — non-technical trust erosion risk

Severity:

```text
P1
```

If advanced complexity overwhelms default UX, user trust declines.

## Desired Direction

```text
simple by default
powerful when requested
safe in both modes
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| visual review | Gemini | Playwright screenshots |
| runtime interaction testing | Playwright | Vitest |
| implementation | Codex/Cursor | Claude Opus |
