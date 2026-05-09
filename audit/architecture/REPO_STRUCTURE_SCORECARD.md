# Repo Structure Scorecard

## Status

```text
initial scorecard
```

## Sources

- root `package.json`
- app workspace package files
- generated-app fixtures and release-evidence package files

## Observed Workspace Structure

Root workspaces currently include:

```text
apps/control-plane
apps/orchestrator-api
```

## Observed App Packages

| Path | Role | Initial Classification |
|---|---|---|
| `apps/control-plane` | Next.js control plane UI | canonical app |
| `apps/orchestrator-api` | Express orchestrator API | canonical app |
| `apps/claude-runner` | model runner service package discovered in repo search | architectural review required |

## Observed Support Areas

| Path | Role | Initial Classification |
|---|---|---|
| `packages/validation` | validators, proof runners, tests | core validation package |
| `packages/ui-preview-engine` | live preview/editing model and tests | core UI-builder package |
| `fixtures/generated-app-corpus` | representative generated apps | test/evaluation fixtures |
| `release-evidence/generated-apps` | generated-app release evidence | evidence artifact area |
| `scripts` | launch, proof, audit, local startup scripts | operational tooling |
| `audit` | phase audit evidence | governance/audit area |
| `docs` | target and operating docs | governance/docs area |

## Initial Scorecard

| Area | Score | Notes |
|---|---:|---|
| Workspace clarity | 6/10 | only two workspaces registered; additional app-like directories require classification |
| App boundary clarity | 7/10 | control-plane and orchestrator-api boundaries are clear |
| Package boundary clarity | 6/10 | validation package is broad; package ownership needs map |
| Generated-app isolation | 7/10 | generated app fixtures/evidence appear separated from core apps |
| Proof/validator separation | 7/10 | proof tiers now exist; deeper validator truth audit remains Phase 3 |
| Commercial boundary clarity | 5/10 | commercial concerns appear spread across scripts/tests/validators |
| Engine/orchestration clarity | 5/10 | needs deeper boundary map in Phase 2 |
| UX/control boundary clarity | 6/10 | UI package exists; live builder boundaries require audit |

## Initial Architecture Risk Themes

1. Root `package.json` script surface is very large and acts as an implicit command registry.
2. `packages/validation` likely contains multiple responsibilities: tests, validators, proof runners, runtime checks, generated-app validators.
3. `apps/claude-runner` appears app-like but is not registered in root workspaces; classify as experimental, support service, or obsolete.
4. Commercial readiness checks exist but may be distributed across validation scripts, root commands, and release evidence.
5. Generated-app fixtures and release evidence are separated, which is good, but need source-of-truth rules.

## Tool / Model Assignment

| Task | Best Tool |
|---|---|
| boundary interpretation | GPT-5.5 |
| large package split recommendations | Claude Opus |
| file movement/refactor execution | Codex/Cursor |
| dependency graph execution | madge / dependency-cruiser |

## Next Audit Steps

- create boundary violations registry
- create dependency graph plan
- classify packages by ownership
- map root scripts into baseline/commercial/max-power/ops groups
- identify app-like directories not in workspaces
