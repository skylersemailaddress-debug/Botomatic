# Generated App Isolation Audit

## Status

```text
initial isolation audit
```

## Purpose

Determine whether generated applications are properly isolated from Botomatic core systems.

## Required Isolation Properties

Generated apps should:

- build independently
- deploy independently
- avoid hidden Botomatic runtime coupling
- avoid privileged internal imports
- avoid leaking validator internals
- preserve export portability
- preserve tenant isolation
- preserve preview/source consistency

## Initial Observations

Observed areas:

```text
fixtures/generated-app-corpus
release-evidence/generated-apps
```

This separation is positive but Phase 2 must determine:

- which is source-of-truth
- whether fixtures represent canonical outputs
- whether generated apps depend on hidden internal runtime assumptions
- whether generated outputs remain portable outside Botomatic

## Initial Risks

### GA-001 — hidden runtime coupling risk

Severity:

```text
P1
```

Reason:

Generated apps must not silently depend on internal Botomatic runtime state.

### GA-002 — export portability not yet proven architecturally

Severity:

```text
P1
```

Reason:

Commercial credibility depends on generated outputs being portable and independently runnable.

### GA-003 — release evidence ownership rules incomplete

Severity:

```text
P2
```

Reason:

Need explicit governance for:

- generated app evidence
- validator ownership
- release packet ownership
- export verification ownership

## Desired Architecture Direction

```text
Botomatic core
  -> generates isolated app workspace
  -> validates isolated workspace
  -> exports isolated workspace
  -> attaches evidence packet
```

not:

```text
Botomatic runtime tightly coupled to generated app runtime
```

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| isolation reasoning | GPT-5.5 | Claude Opus |
| generated-app runtime verification | Playwright/Vitest | Codex/Cursor |
| export verification | Codex/Cursor | GPT-5.5 |
| large extraction/refactor planning | Claude Opus | GPT-5.5 |

## Required Next Evidence

- map generated-app runtime imports
- map generated-app validator dependencies
- verify standalone build paths
- verify standalone deployment paths
- verify preview/source sync behavior
