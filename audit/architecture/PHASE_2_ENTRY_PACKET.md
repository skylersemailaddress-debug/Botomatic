# Phase 2 Entry Packet — Repo Structure and Architecture Audit

## Purpose

Prepare the Phase 2 architecture audit without starting broad refactors.

## Entry Preconditions

- Phase 0 claim boundary complete
- Phase 1 baseline workflow green
- proof tiers defined
- workflow inventory complete
- baseline blocker registry updated

## Phase 2 Audit Scope

Phase 2 will audit whether Botomatic is structurally organized like a serious autonomous software platform.

## Required Audit Areas

1. monorepo/workspace structure
2. app boundaries
3. package boundaries
4. chat intake boundaries
5. Build Contract boundaries
6. planner/executor boundaries
7. validation/proof boundaries
8. generated-app isolation
9. tenant/project boundaries
10. live preview/source-sync boundaries
11. deployment/export boundaries
12. observability/commercial boundaries

## Required Outputs

```text
audit/architecture/ARCHITECTURE_AUDIT.md
audit/architecture/REPO_STRUCTURE_SCORECARD.md
audit/architecture/BOUNDARY_VIOLATIONS.md
audit/architecture/DEPENDENCY_GRAPH.md
audit/architecture/REFACTOR_BACKLOG.md
```

## Required Tools

| Task | Primary Tool | Secondary Tool |
|---|---|---|
| architecture reasoning | GPT-5.5 | Claude Opus |
| dependency graph | dependency-cruiser / madge | GPT-5.5 |
| dead code | ts-prune | Codex |
| package/script graph | npm ls | GPT-5.5 |
| targeted implementation | Codex / Cursor | Claude Opus |

## Validation Commands

```bash
npx madge --circular .
npx dependency-cruiser src packages apps
npx ts-prune
npm run lint
npm run typecheck
```

## Phase 2 Non-Goals

- no UI redesign
- no feature expansion
- no commercial launch work
- no max-power proof expansion
- no broad refactor until architecture findings are classified

## Exit Criteria

Phase 2 exits only when:

- architecture boundaries are documented
- dependency risks are identified
- circular dependency risks are classified
- generated-app isolation is reviewed
- orchestration boundaries are reviewed
- refactor backlog is prioritized by commercial launch risk
