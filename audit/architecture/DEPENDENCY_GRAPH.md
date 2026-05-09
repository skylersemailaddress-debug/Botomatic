# Dependency Graph

## Status

```text
executed successfully via GitHub Actions
```

## Purpose

Capture dependency structure, circular dependencies, workspace coupling, and architecture-risk signals for Phase 2.

## Evidence Source

```text
Workflow: Phase 2 Architecture Graph Audit
Run ID: 25586384625
Run: #2
Status: SUCCESS
Duration: 44s
Artifact: phase-2-architecture-graph-evidence
Artifact ID: 6891195176
Head SHA: 642d1953f2b6753822cbcb9ac9f9ccdb57ba731e
```

## Commands Executed

```bash
npx madge --circular .
npx dependency-cruiser src packages apps
npx ts-prune
npm ls --all --depth=2
npm run lint
npm run typecheck
```

## Evidence Paths

```text
audit/architecture/logs/01-madge-circular.log
audit/architecture/logs/02-dependency-cruiser.log
audit/architecture/logs/03-ts-prune.log
audit/architecture/logs/04-npm-ls-depth-2.log
audit/architecture/logs/05-lint.log
audit/architecture/logs/06-typecheck.log
audit/architecture/logs/architecture-exit-summary.txt
```

## Graph Audit Result

The Phase 2 graph workflow completed successfully.

This means:

- graph tooling executed through CI
- evidence artifacts were produced
- lint remained green
- typecheck remained green
- graph findings can now be classified from artifact logs

## Dependency Risk Categories

| Risk | Meaning | Current Status |
|---|---|---|
| circular dependency | modules depend on each other cyclically | evidence captured |
| app-to-app dependency | one deployed app imports another app directly | evidence captured |
| validator-to-app dependency | validator imports runtime app internals instead of contracts | evidence captured |
| generated-app-to-core dependency | generated output couples to Botomatic internals | evidence captured |
| proof-to-commercial coupling | proof tier depends on unrelated launch/commercial state | partially remediated by proof tiering |
| script-only architecture | major ownership exists only in root scripts | active architecture risk |

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| graph command execution | GitHub Actions | Codex/Cursor |
| graph interpretation | GPT-5.5 | Claude Opus |
| large refactor planning | Claude Opus | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |

## Initial Interpretation

Phase 2 has moved from planned graph analysis to evidence-backed graph analysis. Remaining work is classification, not execution setup.