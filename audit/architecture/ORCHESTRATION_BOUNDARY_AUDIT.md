# Orchestration Boundary Audit

## Status

```text
initial boundary map
```

## Purpose

Audit whether Botomatic's autonomous builder flow has clear boundaries from user intent through execution, validation, repair, preview, and release evidence.

## Target Lifecycle

```text
user intent
-> intake
-> Build Contract
-> planning
-> generation/source mutation
-> validation
-> repair loop
-> preview
-> export/deployment
-> release evidence
```

## Required Boundary Questions

1. Is user intent normalized before execution?
2. Is Build Contract approval mandatory before autonomous mutation?
3. Is planning separated from execution?
4. Is execution isolated by project/tenant/workspace?
5. Are validation and proof systems separate from public claims?
6. Are repair loops bounded and observable?
7. Is preview/source sync enforced before export or launch?
8. Is deployment gated by evidence?
9. Are failures classified and surfaced plainly?
10. Is every state transition auditable?

## Initial Risk Themes

### OB-001 — lifecycle map requires source-backed verification

Severity:

```text
P1
```

Reason:

The repo contains many validators and proof scripts, but Phase 2 must verify whether they represent one coherent orchestration lifecycle or multiple loosely coupled proof surfaces.

### OB-002 — repair loop and execution boundaries need classification

Severity:

```text
P1
```

Reason:

Autonomous repair is a commercial trust feature. It must be bounded, observable, and evidence-backed.

### OB-003 — deployment/export gates must be separated from baseline proof

Severity:

```text
P1
```

Reason:

Phase 1 fixed proof tiering. Phase 2 must now ensure architecture boundaries align with those tiers.

## Tool / Model Ownership

| Task | Primary | Secondary |
|---|---|---|
| lifecycle reasoning | GPT-5.5 | Claude Opus |
| source verification | Codex/Cursor | GPT-5.5 |
| repair loop refactor planning | Claude Opus | GPT-5.5 |
| runtime proof implementation | Codex/Cursor | Playwright/Vitest |

## Required Next Evidence

- source map of intake modules
- source map of Build Contract modules
- source map of planner/executor modules
- source map of repair modules
- source map of preview/source-sync modules
- source map of deployment/export gates
