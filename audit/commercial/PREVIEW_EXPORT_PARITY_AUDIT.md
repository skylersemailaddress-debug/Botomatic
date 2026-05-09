# Preview Export Parity Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated-app previews, exported source, deployments, and runtime behavior remain synchronized and trustworthy.

## Required Parity Properties

- preview/source synchronization
- export/runtime synchronization
- validator-linked preview state
- deployment parity validation
- responsive/mobile parity
- asset/config parity
- environment parity
- rollback parity
- accessibility parity
- generated-app repair parity

## Required Questions

1. Can preview diverge from exported source?
2. Can deployments behave differently from preview/runtime assumptions?
3. Are validators tied to exported artifacts?
4. Can repairs create preview/runtime mismatches?
5. Are environment variables/config represented consistently?
6. Are accessibility/runtime states consistent across preview/export?
7. Can rollback restore parity safely?

## Initial Risks

### PEP-001 — preview/export divergence risk

Severity:

```text
P1
```

Commercial trust collapses if preview does not represent exported reality.

### PEP-002 — environment parity drift risk

Severity:

```text
P1
```

Generated applications may behave differently across preview and deployment environments.

### PEP-003 — validator/export mismatch risk

Severity:

```text
P1
```

Validators must evaluate deployable/exported artifacts, not preview-only states.

## Desired Direction

```text
preview
-> validated source
-> export artifact
-> deployment parity
-> observable runtime truth
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| architecture reasoning | GPT-5.5 | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
