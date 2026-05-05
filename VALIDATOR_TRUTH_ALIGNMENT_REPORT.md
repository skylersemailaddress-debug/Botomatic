# Validator Truth Alignment Report

Generated: 2026-05-05 UTC

## Branch and commit

- Branch: `fix/validator-truth-alignment`
- Starting audit commit preserved: `bb2779f Add enterprise launch gap audit and path census (audit artifacts + JSON matrices)`
- Safety tag created: `audit-gap-baseline-20260505-225222`
- Local audit preservation branch created/updated: `audit/path-census-enterprise-gap`

## Remote / merge recovery result

- `origin` configured: no
- Pushed: no
- PR created: no
- GitHub CLI available: no
- Main/master branch available locally: no
- Result: `REMOTE_UNAVAILABLE: audit work preserved locally on branch audit/path-census-enterprise-gap and safety tag created.`
- Manual commands needed when a remote is known:

```bash
git remote add origin <REPO_URL>
git push -u origin audit/path-census-enterprise-gap
```

Because no local `main` or `master` branch exists, validator truth alignment continued from `audit/path-census-enterprise-gap` with warning: `NO_MAIN_BRANCH_AVAILABLE: continuing locally from current audit commit.`

## Commands run

### Remote/branch diagnostics and recovery

- `pwd`
- `git branch --show-current`
- `git status`
- `git log --oneline -n 8`
- `git remote -v`
- `git branch -a`
- `command -v gh || true`
- `git tag audit-gap-baseline-$(date +%Y%m%d-%H%M%S)`
- `git branch -f audit/path-census-enterprise-gap HEAD`
- remote discovery via `git config`, environment variables, `git config --list`, and repository metadata search
- `git checkout -B fix/validator-truth-alignment audit/path-census-enterprise-gap`

### Pre-change validation capture

- `npm run test` — failed
- `npm run validate:all` — failed with 18 validator failures

### Final validation

- `npm run build` — passed
- `npm run test` — passed
- `npm run validate:all` — failed with 15 remaining validator failures

## Failing tests/validators before changes

### `npm run test`

- `packages/validation/src/tests/proDashboardTruthState.test.ts` failed with `ENOENT` because it read deleted legacy file `apps/control-plane/src/components/pro/ProDashboard.tsx`.
- `packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts` also referenced deleted legacy `ProDashboard.tsx` and deleted `VibeOrchestrationPanel.tsx`, but root test stopped at the first failure.

### `npm run validate:all`

Before changes, 18 validators failed:

1. `Validate-Botomatic-UIReadiness`
2. `Validate-Botomatic-UIControlPlaneIntegration`
3. `Validate-Botomatic-LiveUIBuilderDataStateApiWiringReadiness`
4. `Validate-Botomatic-LiveUIBuilderReliabilityRepairReadiness`
5. `Validate-Botomatic-LiveUIBuilderUXPolishReadiness`
6. `Validate-Botomatic-LiveUIBuilderExportDeployReadiness`
7. `Validate-Botomatic-LiveUIBuilderPlatformBuilderReadiness`
8. `Validate-Botomatic-DashboardRouteIntegrityReadiness`
9. `Validate-Botomatic-LiveUIBuilderInteractionReadiness`
10. `Validate-Botomatic-LiveUIBuilderVisualReadiness`
11. `Validate-Botomatic-LiveUIBuilderInteractionUXReadiness`
12. `Validate-Botomatic-LiveUIBuilderSourceSyncReadiness`
13. `Validate-Botomatic-LiveUIBuilderAppStructureReadiness`
14. `Validate-Botomatic-LiveUIBuilderSourceIdentityReadiness`
15. `Validate-Botomatic-LiveUIBuilderMultiFilePlanningReadiness`
16. `Validate-Botomatic-LiveUIBuilderFullProjectGenerationReadiness`
17. `Validate-Botomatic-LiveUIBuilderDesignSystemReadiness`
18. `Validate-Botomatic-GeneratedAppRuntimeSmokeReadiness`

## Classification of each failure

| Failure | Classification | Reason |
| --- | --- | --- |
| `proDashboardTruthState.test.ts` ENOENT | stale validator/test reference | It targeted deleted legacy `apps/control-plane/src/components/pro/ProDashboard.tsx`; audits identify `apps/control-plane/src/components/vibe/VibeDashboard.tsx` and `/projects/[projectId]` as canonical. |
| `wave026LiveOrchestrationLoop.test.ts` legacy reads | stale validator/test reference | It targeted deleted `ProDashboard.tsx` and deleted `VibeOrchestrationPanel.tsx`; canonical orchestration status is now inline in `VibeDashboard` backed by `useVibeOrchestration`. |
| `Validate-Botomatic-UIReadiness` | stale validator reference | It required old `/vibe`, `/advanced`, `ProDashboard`, commercial shell/cockpit files, and `commercial-workspace.css` even though audits identify `AppShell` + `VibeDashboard` + `app.css`/`globals.css`/`tokens.css` as canonical. |
| `Validate-Botomatic-UIControlPlaneIntegration` | stale validator reference | It required deleted commercial/pro route and shell files instead of canonical AppShell/VibeDashboard/detail pages. |
| `Validate-Botomatic-DashboardRouteIntegrityReadiness` | stale validator reference | It required deleted `/projects/[projectId]/vibe/page.tsx` and `/advanced/page.tsx` routes. |
| Live UI Builder data/state/API, reliability repair, UX polish, export/deploy, platform builder, interaction, visual, interaction UX, source sync, app structure, source identity, multi-file planning, full-project generation, design system, generated runtime smoke | true product gaps / proof gaps | The validators still fail after canonical route/shell alignment because required live-builder panels/proofs/files are absent or incomplete. These should not be faked by restoring deleted legacy UI or weakening checks; they need targeted product/proof work later. |

## Files changed

1. `packages/validation/src/tests/proDashboardTruthState.test.ts`
2. `packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts`
3. `packages/validation/src/repoValidators.ts`
4. `packages/validation/src/repoValidators/dashboardRouteIntegrityReadiness.ts`
5. `VALIDATOR_TRUTH_ALIGNMENT_REPORT.md`

## Old target path -> new canonical target path

| Validation surface | Old target path(s) | New canonical target path(s) | Validation intent preserved |
| --- | --- | --- | --- |
| Truth state test | `apps/control-plane/src/components/pro/ProDashboard.tsx` | `apps/control-plane/src/app/projects/[projectId]/page.tsx`, `apps/control-plane/src/components/vibe/VibeDashboard.tsx`, `apps/control-plane/src/services/firstRun.ts`, `apps/control-plane/src/components/builder/useVibeOrchestration.ts` | Still rejects static fake operational claims and requires truthful fallback/blocked states, but validates the live canonical Vibe route. |
| Live orchestration loop test | `apps/control-plane/src/components/pro/ProDashboard.tsx`, `apps/control-plane/src/components/builder/VibeOrchestrationPanel.tsx` | `apps/control-plane/src/components/vibe/VibeDashboard.tsx`, `apps/control-plane/src/components/builder/useVibeOrchestration.ts`, `apps/control-plane/src/services/orchestration.ts` | Still requires main prompt orchestration submission, status fallbacks, and Build Map backed by orchestration graph state. |
| UI readiness validator | `/projects/[projectId]/vibe/page.tsx`, `/advanced/page.tsx`, `ProDashboard.tsx`, commercial shell/cockpit files, `commercial-workspace.css` | `/projects/[projectId]/page.tsx`, `AppShell.tsx`, `VibeDashboard.tsx`, `useVibeOrchestration.ts`, `useLiveUIBuilderVibe.ts`, canonical detail pages, `app.css`, `globals.css`, `tokens.css` | Still validates route/shell alignment, Vibe surface signals, real data hooks, guarded live UI builder hook behavior, state handling, design tokens, and placeholder guard. |
| UI control-plane integration validator | `/advanced/page.tsx`, commercial shell/cockpit files | Canonical project route, AppShell, VibeDashboard, detail pages, overview panels, and real API service wrappers | Still validates mounted settings/evidence/deployment/logs panels and service API mappings. |
| Dashboard route integrity validator | `/projects/[projectId]/vibe/page.tsx`, `/advanced/page.tsx` | `/projects/[projectId]/page.tsx`, `AppShell.tsx`, `VibeDashboard.tsx` | Still validates route integrity and dashboard API rewrite ordering while ensuring old routes are not required. |

## Final command results

- `npm run build` — passed
- `npm run test` — passed
- `npm run validate:all` — failed with 15 remaining failures

## Remaining failures

The remaining `validate:all` failures are classified as true live UI builder product/proof gaps, not stale route/shell validator references:

1. `Validate-Botomatic-LiveUIBuilderDataStateApiWiringReadiness`
2. `Validate-Botomatic-LiveUIBuilderReliabilityRepairReadiness`
3. `Validate-Botomatic-LiveUIBuilderUXPolishReadiness`
4. `Validate-Botomatic-LiveUIBuilderExportDeployReadiness`
5. `Validate-Botomatic-LiveUIBuilderPlatformBuilderReadiness`
6. `Validate-Botomatic-LiveUIBuilderInteractionReadiness`
7. `Validate-Botomatic-LiveUIBuilderVisualReadiness`
8. `Validate-Botomatic-LiveUIBuilderInteractionUXReadiness`
9. `Validate-Botomatic-LiveUIBuilderSourceSyncReadiness`
10. `Validate-Botomatic-LiveUIBuilderAppStructureReadiness`
11. `Validate-Botomatic-LiveUIBuilderSourceIdentityReadiness`
12. `Validate-Botomatic-LiveUIBuilderMultiFilePlanningReadiness`
13. `Validate-Botomatic-LiveUIBuilderFullProjectGenerationReadiness`
14. `Validate-Botomatic-LiveUIBuilderDesignSystemReadiness`
15. `Validate-Botomatic-GeneratedAppRuntimeSmokeReadiness`

## Next recommended step

Fix remaining real product/proof gaps first. Specifically, complete or consciously rescope the live UI builder source-sync/panel/proof surfaces before attempting a full build-path proof. Once the live UI builder validators are truthfully green, the next recommended step is full durable build-path proof.
