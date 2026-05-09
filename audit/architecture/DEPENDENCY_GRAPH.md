# Dependency Graph

## Status

```text
planned; awaiting graph command execution
```

## Purpose

Capture dependency structure, circular dependencies, workspace coupling, and architecture-risk signals for Phase 2.

## Required Commands

```bash
npx madge --circular .
npx dependency-cruiser src packages apps
npx ts-prune
npm ls --all --depth=2
npm run lint
npm run typecheck
```

## Expected Evidence Paths

```text
audit/architecture/logs/madge-circular.log
audit/architecture/logs/dependency-cruiser.log
audit/architecture/logs/ts-prune.log
audit/architecture/logs/npm-ls-depth-2.log
audit/architecture/logs/lint.log
audit/architecture/logs/typecheck.log
```

## Dependency Risk Categories

| Risk | Meaning |
|---|---|
| circular dependency | modules depend on each other cyclically |
| app-to-app dependency | one deployed app imports another app directly |
| validator-to-app dependency | validator imports runtime app internals instead of contracts |
| generated-app-to-core dependency | generated output couples to Botomatic internals |
| proof-to-commercial coupling | proof tier depends on unrelated launch/commercial state |
| script-only architecture | major ownership exists only in root scripts |

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| graph command execution | Codex/Cursor or local terminal | GitHub Actions |
| graph interpretation | GPT-5.5 | Claude Opus |
| large refactor planning | Claude Opus | GPT-5.5 |
| implementation | Codex/Cursor | Claude Opus |

## Initial Notes

Phase 2 has not yet executed graph tooling. Until graph evidence exists, architecture findings remain provisional.