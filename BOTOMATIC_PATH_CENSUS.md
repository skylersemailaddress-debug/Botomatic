# Botomatic Hard Path Census

Generated: 2026-05-05 UTC. This is a read-only/static audit; only `BOTOMATIC_PATH_CENSUS.md` and `botomatic-path-census.json` were created.

## 1. Executive summary

### Baseline recorded
- Branch: `work`
- Commit SHA: `9c6ec56b8fcd7ed67887da7119da3499a65cfeba`
- Initial git status: `## work`
- Package manager detected: npm (root `package.json`, `package-lock.json`, npm workspaces).
- Root package scripts: captured in section 11; package/script-bearing files are represented in JSON as file-level items.
- Workspace/package layout: root workspace declares `apps/control-plane` and `apps/orchestrator-api`; `apps/claude-runner` has a package but is outside root workspaces; many `packages/*` source packages are script/import targets but are not root npm workspaces.
- Build/test/validate commands: `build`, `test`, and `validate:all` exist; root `lint` and `typecheck` do not exist.
- Command results: `npm run build` PASS; `npm run test` FAIL on missing `apps/control-plane/src/components/pro/ProDashboard.tsx`; `npm run validate:all` FAIL with 18 failing validators; `npm run lint` FAIL missing script; `npm run typecheck` FAIL missing script. Dependencies were present, so `npm install` was not run.

### Overall repo state
Botomatic currently has a buildable Next.js control plane centered on `/projects/[projectId]` and `VibeDashboard`, plus a large Express orchestrator in `server_app.ts`. The product build passes, but root tests and validation are not green because several tests/validators still point at removed or replaced Vibe/pro/live-UI-builder paths. A substantial historical docs/evidence/receipts layer contains commercial/final/100% style claims that need claim-boundary review against the current failing gates.

### Top 10 findings
1. Production UI build passes and enumerates the current Next route tree.
2. Root test is stale: it opens deleted `apps/control-plane/src/components/pro/ProDashboard.tsx`.
3. `validate:all` reports 60 passed and 18 failed validators.
4. Canonical project route is `apps/control-plane/src/app/projects/[projectId]/page.tsx` rendering `VibeDashboard`, not old `/vibe`.
5. No tracked `/projects/[projectId]/advanced`, `commercial`, `pro`, or `cockpit` page was detected.
6. `AppShell` is the canonical current shell; old named commercial/workspace shells were not detected as tracked component files.
7. `apps/orchestrator-api/src/bootstrap.ts` boots `server_app.ts`; `server.ts` looks like a legacy/deprecated API entrypoint.
8. Development mode can use anonymous/disabled auth; commercial mode is configured to require durable repo and auth, but release needs env proof.
9. Bootstrap can downgrade durable/Supabase queue requests to memory if Supabase is unreachable, creating mode-parity risk.
10. Root package scripts execute many non-workspace packages directly.

### Top 10 commercial-release blockers
1. `npm run test` fails.
2. `npm run validate:all` fails 18 validators.
3. Root `lint` script is missing.
4. Root `typecheck` script is missing.
5. Dashboard route integrity validator expects old `/vibe/page.tsx`.
6. ProDashboard truth-state test expects deleted pro UI.
7. Live UI builder validators expect removed/unimplemented wave files.
8. Auth-disabled/anonymous behavior is allowed in development paths.
9. Durable/queue fallback to memory can mask production persistence/distribution failures.
10. Commercial/production/final/100% wording exists in docs/evidence while current validators fail.

### Top 10 cleanup candidates
1. Stale ProDashboard test expectations.
2. Stale `/vibe` route integrity validator.
3. Stale live UI builder app-structure/full-generation/design-system/source-identity validators.
4. Deprecated `apps/orchestrator-api/src/server.ts`.
5. Historical `receipts/**` after archival decision.
6. Old generated project evidence under `release-evidence/generated-apps/proj_*` after proof retention review.
7. Duplicate/final/commercial readiness docs after claim-boundary consolidation.
8. Seed/demo/pro data if still live without demo-mode gates.
9. Any validator-only old shell/cockpit references.
10. Untracked build artifacts should be cleaned outside this audit, if present.

### Top 10 “do not delete yet” risky areas
1. `apps/orchestrator-api/src/server_app.ts`
2. `apps/orchestrator-api/src/bootstrap.ts`
3. `packages/supabase-adapter/src/jobClient.ts`
4. `packages/supabase-adapter/src/durableRepo.ts`
5. `packages/supabase-adapter/src/memoryRepo.ts`
6. `packages/executor-adapters/src/claudeCodeExecutor.ts`
7. `apps/claude-runner/src/server.ts`
8. `packages/validation/src/repoValidators.ts` and repo validator files
9. `packages/packet-engine/src/generator.ts` and `packages/master-truth/src/compiler.ts`
10. `apps/control-plane/src/services/*`

## 2. Canonical target product map
- Canonical live routes: `/`, `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/deployment`, `/projects/[projectId]/logs`, `/projects/[projectId]/evidence`, `/projects/[projectId]/validators`, `/projects/[projectId]/vault`, `/projects/[projectId]/settings`, plus `/projects/[projectId]/onboarding` if product still wants first-run onboarding.
- Canonical shell: `apps/control-plane/src/components/shell/AppShell.tsx` with `workspaceView.ts`.
- Canonical Vibe screen: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`.
- Canonical orchestration: operator/intake -> compileProjectWithIntake -> plan/generatePlan -> enqueueJob -> worker -> executor -> repository persistence/workspace materialization -> validation/evidence/status APIs.
- Canonical validators: current route integrity, UI control plane integration, security/auth governance, reliability, observability, launch readiness, deployment rollback, generated app no-placeholder/commercial-readiness, and claim-boundary gates after stale path references are updated.

## 3. Current detected route map
| Route | Kind | File | Status | Action |
| --- | --- | --- | --- | --- |
| /api/[...path] | api | apps/control-plane/src/app/api/[...path]/route.ts | live | keep |
| /api/hybrid-ci | api | apps/control-plane/src/app/api/hybrid-ci/route.ts | live | keep |
| /api/local-repo-dashboard | api | apps/control-plane/src/app/api/local-repo-dashboard/route.ts | live | keep |
| /api/local-repo-dashboard/stream | api | apps/control-plane/src/app/api/local-repo-dashboard/stream/route.ts | live | keep |
| /api/projects/[projectId]/deploy | api | apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts | live | keep |
| /api/projects/[projectId]/deployments | api | apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts | live | keep |
| /api/projects/[projectId]/execution/[runId] | api | apps/control-plane/src/app/api/projects/[projectId]/execution/[runId]/route.ts | live | keep |
| /api/projects/[projectId]/execution | api | apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts | live | keep |
| /api/projects/[projectId]/jobs | api | apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts | live | keep |
| /api/projects/[projectId]/launch-proof | api | apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts | live | keep |
| /api/projects/[projectId]/launch/verify | api | apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts | live | keep |
| /api/projects/[projectId]/rollback | api | apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts | live | keep |
| /api/projects/[projectId]/runtime/logs | api | apps/control-plane/src/app/api/projects/[projectId]/runtime/logs/route.ts | live | keep |
| /api/projects/[projectId]/runtime | api | apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts | live | keep |
| /api/projects/[projectId]/runtime/start | api | apps/control-plane/src/app/api/projects/[projectId]/runtime/start/route.ts | live | keep |
| /api/projects/[projectId]/runtime/stop | api | apps/control-plane/src/app/api/projects/[projectId]/runtime/stop/route.ts | live | keep |
| /favicon.ico | api | apps/control-plane/src/app/favicon.ico/route.ts | live | keep |
| / | layout | apps/control-plane/src/app/layout.tsx | live | keep |
| / | page | apps/control-plane/src/app/page.tsx | live | keep |
| /projects/[projectId]/deployment | page | apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx | live | keep |
| /projects/[projectId]/evidence | page | apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx | live | keep |
| /projects/[projectId]/logs | page | apps/control-plane/src/app/projects/[projectId]/logs/page.tsx | live | keep |
| /projects/[projectId]/onboarding | page | apps/control-plane/src/app/projects/[projectId]/onboarding/page.tsx | live | verify/improve |
| /projects/[projectId] | page | apps/control-plane/src/app/projects/[projectId]/page.tsx | live | keep |
| /projects/[projectId]/settings | page | apps/control-plane/src/app/projects/[projectId]/settings/page.tsx | live | keep |
| /projects/[projectId]/validators | page | apps/control-plane/src/app/projects/[projectId]/validators/page.tsx | live | keep |
| /projects/[projectId]/vault | page | apps/control-plane/src/app/projects/[projectId]/vault/page.tsx | live | keep |
| /projects/new | page | apps/control-plane/src/app/projects/new/page.tsx | live | keep |
| /projects | page | apps/control-plane/src/app/projects/page.tsx | live | keep |

No tracked old `/projects/[projectId]/vibe`, `advanced`, `commercial`, `pro`, or `cockpit` page file was detected.

## 4. Current detected backend API map
| Express/API route | File | Visible auth wrapper | Status |
| --- | --- | --- | --- |
| GET /api/health | apps/orchestrator-api/src/server.ts:267 | no requireRole wrapper visible | deprecated legacy entrypoint |
| POST /api/projects/intake | apps/orchestrator-api/src/server.ts:280 | no requireRole wrapper visible | deprecated legacy entrypoint |
| POST /api/projects/:projectId/compile | apps/orchestrator-api/src/server.ts:302 | no requireRole wrapper visible | deprecated legacy entrypoint |
| POST /api/projects/:projectId/plan | apps/orchestrator-api/src/server.ts:329 | no requireRole wrapper visible | deprecated legacy entrypoint |
| POST /api/projects/:projectId/git/result | apps/orchestrator-api/src/server.ts:351 | no requireRole wrapper visible | deprecated legacy entrypoint |
| POST /api/projects/:projectId/dispatch/execute-next | apps/orchestrator-api/src/server.ts:375 | no requireRole wrapper visible | deprecated legacy entrypoint |
| GET /api/projects/:projectId/status | apps/orchestrator-api/src/server.ts:499 | no requireRole wrapper visible | deprecated legacy entrypoint |
| GET /health | apps/orchestrator-api/src/server_app.ts:1710 | no requireRole wrapper visible | live |
| GET /api/health | apps/orchestrator-api/src/server_app.ts:1711 | no requireRole wrapper visible | live |
| GET /api/ops/metrics | apps/orchestrator-api/src/server_app.ts:1715 | reviewer | live |
| GET /api/ops/errors | apps/orchestrator-api/src/server_app.ts:1725 | reviewer | live |
| GET /api/ops/queue | apps/orchestrator-api/src/server_app.ts:1739 | reviewer | live |
| POST /api/projects/intake | apps/orchestrator-api/src/server_app.ts:1751 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/intake/sources | apps/orchestrator-api/src/server_app.ts:1785 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/intake/sources/:sourceId | apps/orchestrator-api/src/server_app.ts:1796 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/source | apps/orchestrator-api/src/server_app.ts:1809 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/pasted-text | apps/orchestrator-api/src/server_app.ts:1887 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/github | apps/orchestrator-api/src/server_app.ts:1972 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/cloud-link | apps/orchestrator-api/src/server_app.ts:2082 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/local-manifest | apps/orchestrator-api/src/server_app.ts:2167 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/intake/file | apps/orchestrator-api/src/server_app.ts:2250 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/analyze | apps/orchestrator-api/src/server_app.ts:2532 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/clarify | apps/orchestrator-api/src/server_app.ts:2568 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/assumptions/accept | apps/orchestrator-api/src/server_app.ts:2587 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/recommendations/apply | apps/orchestrator-api/src/server_app.ts:2622 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/build-contract | apps/orchestrator-api/src/server_app.ts:2649 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/spec/approve | apps/orchestrator-api/src/server_app.ts:2673 | reviewer | live |
| GET /api/projects/:projectId/spec/status | apps/orchestrator-api/src/server_app.ts:2700 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/self-upgrade/spec | apps/orchestrator-api/src/server_app.ts:2738 | reviewer | live |
| GET /api/projects/:projectId/self-upgrade/status | apps/orchestrator-api/src/server_app.ts:2766 | reviewer | live |
| POST /api/projects/:projectId/repo/completion-contract | apps/orchestrator-api/src/server_app.ts:2790 | reviewer | live |
| GET /api/projects/:projectId/repo/status | apps/orchestrator-api/src/server_app.ts:2831 | reviewer | live |
| POST /api/projects/:projectId/universal/capability-pipeline | apps/orchestrator-api/src/server_app.ts:2855 | reviewer | live |
| GET /api/projects/:projectId/universal/capability-pipeline | apps/orchestrator-api/src/server_app.ts:2880 | reviewer | live |
| POST /api/projects/:projectId/autonomous-build/start | apps/orchestrator-api/src/server_app.ts:2893 | reviewer | live |
| GET /api/projects/:projectId/autonomous-build/status | apps/orchestrator-api/src/server_app.ts:2928 | reviewer | live |
| POST /api/projects/:projectId/autonomous-build/resume | apps/orchestrator-api/src/server_app.ts:2971 | reviewer | live |
| POST /api/projects/:projectId/autonomous-build/approve-blocker | apps/orchestrator-api/src/server_app.ts:2999 | reviewer | live |
| POST /api/projects/:projectId/operator/send | apps/orchestrator-api/src/server_app.ts:3035 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/compile | apps/orchestrator-api/src/server_app.ts:3707 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/plan | apps/orchestrator-api/src/server_app.ts:3721 | no requireRole wrapper visible | live |
| POST /api/projects/:projectId/dispatch/execute-next | apps/orchestrator-api/src/server_app.ts:3740 | reviewer | live |
| POST /api/projects/:projectId/repair/replay | apps/orchestrator-api/src/server_app.ts:3759 | admin | live |
| GET /api/projects/:projectId/status | apps/orchestrator-api/src/server_app.ts:3793 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/state | apps/orchestrator-api/src/server_app.ts:3805 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/resume | apps/orchestrator-api/src/server_app.ts:3839 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/runtime | apps/orchestrator-api/src/server_app.ts:3862 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/execution | apps/orchestrator-api/src/server_app.ts:3890 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/execution/:runId | apps/orchestrator-api/src/server_app.ts:3918 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/ui/overview | apps/orchestrator-api/src/server_app.ts:3946 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/ui/packets | apps/orchestrator-api/src/server_app.ts:3957 | no requireRole wrapper visible | live |
| GET /api/projects/:projectId/ui/artifacts | apps/orchestrator-api/src/server_app.ts:3968 | reviewer | live |
| GET /api/projects/:projectId/ui/gate | apps/orchestrator-api/src/server_app.ts:3979 | reviewer | live |
| GET /api/projects/:projectId/ui/proof-status | apps/orchestrator-api/src/server_app.ts:3991 | reviewer | live |
| GET /api/projects/:projectId/ui/security-center | apps/orchestrator-api/src/server_app.ts:4006 | reviewer | live |
| POST /api/projects/:projectId/security-center/dependency-scan | apps/orchestrator-api/src/server_app.ts:4061 | reviewer | live |
| POST /api/projects/:projectId/governance/approval | apps/orchestrator-api/src/server_app.ts:4096 | admin | live |
| POST /api/projects/:projectId/deploy/promote | apps/orchestrator-api/src/server_app.ts:4152 | admin | live |
| POST /api/projects/:projectId/deploy/rollback | apps/orchestrator-api/src/server_app.ts:4192 | admin | live |
| GET /api/projects/:projectId/ui/deployments | apps/orchestrator-api/src/server_app.ts:4238 | reviewer | live |
| GET /api/projects/:projectId/ui/audit | apps/orchestrator-api/src/server_app.ts:4250 | reviewer | live |
| GET /registry/capabilities | apps/orchestrator-api/src/capabilitiesStandalone.ts:60 | no requireRole wrapper visible | live |
| GET /api/registry/capabilities | apps/orchestrator-api/src/capabilitiesStandalone.ts:64 | no requireRole wrapper visible | live |

Next API handlers under `apps/control-plane/src/app/api/**/route.ts` are also route-mounted by Next and are included in JSON.

## 5. Core build/orchestration map
- Intake path: `POST /api/projects/intake`; project intake source routes for source, pasted text, GitHub, cloud link, local manifest, and file upload.
- Compile path: `compileProjectWithIntake` enriches request with intake artifacts, compiles master truth, analyzes/merges spec, approves uploaded-intake contracts, and stores run state.
- Plan/packet path: `POST /api/projects/:projectId/plan` gates build blockers and stores `generatePlan(project.masterTruth)`.
- Queue path: `POST /dispatch/execute-next` enqueues next packet with `enqueueJob`; repair replay can requeue failed packets.
- Worker path: `startQueueWorker` polls `workerTick`, claims jobs, and calls `processJob`.
- Executor path: `getExecutor` selects `ClaudeCodeExecutor` for `EXECUTOR=claude`, otherwise `MockExecutor`; bootstrap can spawn `apps/claude-runner/src/server.ts`.
- Wave progression path: packet completion/failure helpers, job finalization, status APIs, and plan packet state advance through the worker.
- Workspace materialization path: local generated workspace writer in `server_app.ts` plus GitHub commit/PR operation path.
- Validation/evidence path: `runValidation`, repo validators, proof scripts, `release-evidence/**`, and UI proof/status endpoints.
- Exact gaps: stale validators, auth/memory fallback release proof, missing root lint/typecheck, and root tests failing on deleted UI.

## 6. UI shell/component map
- Canonical shell: `apps/control-plane/src/components/shell/AppShell.tsx`.
- Old shells: no tracked `ProjectWorkspaceShell`, `CommercialWorkspaceShell`, `ProductionPageShell`, or `MainSplitLayout` component files detected; `NorthStarBuilderShell` remains and needs human confirmation.
- Live/duplicate/stale component census excerpt:
- **unknown** `apps/claude-runner/package.json` — verify
- **live** `apps/claude-runner/src/types.ts` — keep
- **improve** `apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx` — improve (wording/demo hit)
- **live** `apps/control-plane/src/components/builder/useVibeOrchestration.ts` — keep
- **live** `apps/control-plane/src/components/chat/Composer.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/chat/ConversationPane.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/chat/MessageList.tsx` — keep
- **unknown** `apps/control-plane/src/components/chat/QuickActionRow.tsx` — verify
- **live** `apps/control-plane/src/components/chat/actionRailCommands.ts` — keep
- **live** `apps/control-plane/src/components/chat/canonicalCommands.ts` — keep
- **live** `apps/control-plane/src/components/chat/chatCommandExecutor.ts` — keep
- **live** `apps/control-plane/src/components/chat/commandGrammar.ts` — keep
- **live** `apps/control-plane/src/components/chat/intakePipeline.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/chat/intentRouting.ts` — keep
- **live** `apps/control-plane/src/components/chat/nextBestAction.ts` — keep
- **live** `apps/control-plane/src/components/chat/selfUpgradeGuard.ts` — keep
- **live** `apps/control-plane/src/components/chat/systemIntelligence.ts` — keep
- **live** `apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDirectManipulationOverlay.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDocumentRenderer.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/live-ui-builder/LiveUIBuilderInspectOverlay.tsx` — keep
- **unknown** `apps/control-plane/src/components/ops/OpsPanel.tsx` — verify
- **live** `apps/control-plane/src/components/overview/ArtifactPanel.tsx` — keep
- **unknown** `apps/control-plane/src/components/overview/AssumptionLedgerPanel.tsx` — verify
- **live** `apps/control-plane/src/components/overview/AuditPanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/AutonomousBuildRunPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/BuildContractPanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/BuildStatusRail.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/DeploymentHistoryPanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/DeploymentPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/FirstRunWhatsNextPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/GatePanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/GeneratedAppReadinessPanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/IntakeHubPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/LaunchBlockersPanel.tsx` — keep
- **live** `apps/control-plane/src/components/overview/LaunchReadinessPanel.tsx` — keep (wording/demo hit)
- **unknown** `apps/control-plane/src/components/overview/OpenQuestionsPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/OverviewPanel.tsx` — verify
- **live** `apps/control-plane/src/components/overview/PacketPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/ProofValidationPanel.tsx` — keep
- **unknown** `apps/control-plane/src/components/overview/RecommendationPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/RepoRescuePanel.tsx` — verify (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/SecurityCenterPanel.tsx` — keep (wording/demo hit)
- **unknown** `apps/control-plane/src/components/overview/SelfUpgradePanel.tsx` — verify (wording/demo hit)
- **live** `apps/control-plane/src/components/overview/SpecCompletenessPanel.tsx` — keep
- **improve** `apps/control-plane/src/components/pro/proSeedData.ts` — improve (wording/demo hit)
- **live** `apps/control-plane/src/components/runtime/RuntimePreviewPanel.tsx` — keep
- **live** `apps/control-plane/src/components/shell/AppShell.tsx` — keep (wording/demo hit)
- **unknown** `apps/control-plane/src/components/shell/workspaceView.ts` — verify
- **live** `apps/control-plane/src/components/ui/DomainCoverageGrid.tsx` — keep
- **live** `apps/control-plane/src/components/ui/EmptyState.tsx` — keep
- **live** `apps/control-plane/src/components/ui/ErrorCallout.tsx` — keep
- **live** `apps/control-plane/src/components/ui/EvidenceLink.tsx` — keep
- **live** `apps/control-plane/src/components/ui/LaunchGateBanner.tsx` — keep
- **live** `apps/control-plane/src/components/ui/LoadingSkeleton.tsx` — keep
- **live** `apps/control-plane/src/components/ui/MetricCard.tsx` — keep
- **live** `apps/control-plane/src/components/ui/Panel.tsx` — keep
- **live** `apps/control-plane/src/components/ui/ProofStatusCard.tsx` — keep
- **live** `apps/control-plane/src/components/ui/ReadinessTimeline.tsx` — keep
- **live** `apps/control-plane/src/components/ui/SectionHeader.tsx` — keep
- **live** `apps/control-plane/src/components/ui/StatusBadge.tsx` — keep
- **live** `apps/control-plane/src/components/ui/ValidatorStatusList.tsx` — keep
- **live** `apps/control-plane/src/components/vibe/VibeDashboard.tsx` — keep (wording/demo hit)
- **live** `apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/server/executionRunner.ts` — keep
- **live** `apps/control-plane/src/services/actions.ts` — keep
- **live** `apps/control-plane/src/services/api.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/services/audit.ts` — keep
- **live** `apps/control-plane/src/services/autonomousBuild.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/services/demoMode.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/services/deployments.ts` — keep
- **live** `apps/control-plane/src/services/execution.ts` — keep
- **live** `apps/control-plane/src/services/firstRun.ts` — keep
- **live** `apps/control-plane/src/services/gate.ts` — keep
- **live** `apps/control-plane/src/services/intake.ts` — keep
- **live** `apps/control-plane/src/services/intakeConfig.ts` — keep
- **live** `apps/control-plane/src/services/intakeSources.ts` — keep
- **live** `apps/control-plane/src/services/launchProof.ts` — keep
- **live** `apps/control-plane/src/services/operator.ts` — keep
- **live** `apps/control-plane/src/services/ops.ts` — keep
- **live** `apps/control-plane/src/services/orchestration.ts` — keep
- **live** `apps/control-plane/src/services/overview.ts` — keep
- **live** `apps/control-plane/src/services/packets.ts` — keep
- **unknown** `apps/control-plane/src/services/panelTruth.ts` — verify
- **live** `apps/control-plane/src/services/proDashboard.ts` — keep
- **live** `apps/control-plane/src/services/projectState.ts` — keep
- **live** `apps/control-plane/src/services/proof.ts` — keep (wording/demo hit)
- **live** `apps/control-plane/src/services/repoRescue.ts` — keep
- **live** `apps/control-plane/src/services/runtimePreview.ts` — keep
- **live** `apps/control-plane/src/services/runtimeStatus.ts` — keep
- **live** `apps/control-plane/src/services/secrets.ts` — keep
- **live** `apps/control-plane/src/services/securityCenter.ts` — keep
- **live** `apps/control-plane/src/services/selfUpgrade.ts` — keep
- **live** `apps/control-plane/src/services/spec.ts` — keep
- **live** `apps/control-plane/src/services/truth.ts` — keep
- **live** `docs/rc/WAVE-035_BACKEND_PROOF_AND_RUNNER_CONTRACTS.md` — keep (wording/demo hit)
- **unknown** `fixtures/generated-app-corpus/representative/booking-app/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/bot-agent-console/src/main.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/customer-portal/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/ecommerce-store/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/game-landing-page/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/marketplace/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/mobile-app-shell/src/main.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/app/page.tsx` — verify (wording/demo hit)
- **unknown** `fixtures/generated-app-corpus/representative/web-saas-dashboard/app/page.tsx` — verify
- **live** `packages/blueprints/src/blueprints/analyticsReporting.ts` — keep (wording/demo hit)
- **live** `packages/execution/src/runner.ts` — keep
- **live** `packages/executor-adapters/src/claudeCodeExecutor.ts` — keep (wording/demo hit)
- **live** `packages/executor-adapters/src/claudeExecutorStub.ts` — keep
- **live** `packages/executor-adapters/src/mockExecutor.ts` — keep (wording/demo hit)
- **live** `packages/executor-adapters/src/types.ts` — keep
- **live** `packages/repair-loop/src/runner.ts` — keep
- **live** `packages/repo-completion/src/completionRunner.ts` — keep (wording/demo hit)
- **live** `packages/repo-completion/src/dirtyRepoRepairLoop.ts` — keep (wording/demo hit)
- **live** `packages/repo-intake/src/dirtyRepoEvidence.ts` — keep (wording/demo hit)
- **live** `packages/supabase-adapter/src/client.ts` — keep
- **live** `packages/supabase-adapter/src/durableRepo.ts` — keep
- **live** `packages/supabase-adapter/src/jobClient.ts` — keep (wording/demo hit)
- **live** `packages/supabase-adapter/src/memoryRepo.ts` — keep
- **live** `packages/supabase-adapter/src/schema.sql` — keep
- **live** `packages/supabase-adapter/src/supabaseRepo.ts` — keep
- **live** `packages/supabase-adapter/src/types.ts` — keep
- **live** `packages/trigger-adapter/src/jobRepo.ts` — keep
- **live** `packages/trigger-adapter/src/mockRunner.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/index.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateExistingRepoReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoBuild.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoDeployment.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoNoPlaceholders.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoProductCompleteness.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoSecurity.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoTests.ts` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/clean-candidate/app/page.tsx` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/app/page.tsx` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/dirtyRepoRescueReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/runner.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/runtime/domainRuntimeCommandRunner.ts` — keep
- **live** `packages/validation/src/runtime/generatedAppRuntimeSmokeRunner.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofDirtyRepo.ts` — update_validator_later
- **live** `packages/validation/src/tests/dirtyRepoCompletionContractV2.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/dirtyRepoEvidence.test.ts` — keep
- **live** `packages/validation/src/tests/dirtyRepoRepairLoopProof.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/generatedAppRuntimeSmokeRunner.test.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/tests/localExecutorArtifactMaterialization.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/wave035BackendProofRunnerContracts.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/wave036RunnerApiImplementation.test.ts` — keep
- **unknown** `receipts/beta-simulation/baseline/script-test_generated-app-runtime-smoke-runner.exit` — verify
- **unknown** `release-evidence/generated-apps/bot/deploy/worker.md` — verify
- **unknown** `release-evidence/generated-apps/bot/dist/worker.js` — verify
- **unknown** `release-evidence/generated-apps/bot/src/worker.ts` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/layout.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/pricing/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/components/HeroSection.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/App.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/screens/HomeScreen.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/services/api.ts` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777246024456/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777246116324/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777246396829/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777248493513/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777255715931/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777256631918/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777362157622/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777362595155/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/components/AppShell.tsx` — verify
- **live** `release-evidence/generated-apps/proj_1777362757988/components/StatusCard.tsx` — keep
- **unknown** `release-evidence/generated-apps/web_saas_app/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/app/layout.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/components/AppShell.tsx` — verify

## 7. Vibe Builder screen map
- Live Vibe files: `apps/control-plane/src/app/projects/[projectId]/page.tsx`, `apps/control-plane/src/components/vibe/VibeDashboard.tsx`, `apps/control-plane/src/components/builder/useVibeOrchestration.ts`, `apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts`.
- Data hooks used: first-run, runtime status, launch proof/deploy, orchestration, execution, project resume, and live UI builder hook.
- API endpoints used: `/api/projects/:projectId/operator/send`, `/api/projects/intake`, fallback `/api/orchestrate/action`, `/api/projects/:projectId/status`, `/ui/overview`, `/state`, and execution/runtime endpoints.
- Stale/demo data risks: hardcoded action chips are UI affordances; `proSeedData.ts` requires verification that it is not live outside explicit demo/seed context.
- Improvements: align validators to canonical route, remove or document fallback endpoints with no backend route, and prove live durable-mode data behavior.

## 8. Validator/proof map
- **live** `apps/control-plane/src/server/launchProofStore.ts` — keep (wording/demo hit)
- **live** `docs/dirty-repo-repair-loop-proof.md` — keep
- **live** `packages/proof-engine/src/claimVerifier.ts` — keep
- **live** `packages/proof-engine/src/index.ts` — keep
- **live** `packages/proof-engine/src/proofLedger.ts` — keep
- **live** `packages/proof-engine/src/tests/claimVerifier.test.ts` — keep
- **unknown** `packages/proof-gate/src/readiness.ts` — verify
- **live** `packages/repo-completion/src/incrementalValidator.ts` — keep
- **live** `packages/ui-preview-engine/src/tests/uiSourceApplyProof.test.ts` — keep
- **live** `packages/ui-preview-engine/src/uiSourceApplyProof.ts` — keep
- **live** `packages/validation/src/cache/clearCache.ts` — keep
- **live** `packages/validation/src/cache/validatorCache.ts` — keep
- **live** `packages/validation/src/cli.ts` — keep
- **live** `packages/validation/src/existingRepo/index.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateExistingRepoReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoBuild.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoDeployment.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoNoPlaceholders.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoProductCompleteness.ts` — keep
- **live** `packages/validation/src/existingRepo/validateRepoSecurity.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/existingRepo/validateRepoTests.ts` — keep
- **live** `packages/validation/src/generatedApp/corpusHarness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/launchPackage.ts` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/clean-candidate/README.md` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/clean-candidate/app/page.tsx` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/clean-candidate/package.json` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/manifest.json` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/README.md` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/app/page.tsx` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/package.json` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/preview-ready/README.md` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/preview-ready/package.json` — keep
- **live** `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/preview-ready/src/index.ts` — keep
- **live** `packages/validation/src/generatedApp/tests/generatedAppCommercialReadiness.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/generatedAppCorpusHarness.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/generatedApp/tests/generatedAppNoPlaceholders.test.ts` — update_validator_later (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/generatedAppRepresentativeCorpus.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/tests/noPlaceholder.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateAuthRbac.ts` — keep
- **live** `packages/validation/src/generatedApp/validateCommercialReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateDataModel.ts` — keep
- **live** `packages/validation/src/generatedApp/validateDeployment.ts` — keep
- **stale_validator_reference** `packages/validation/src/generatedApp/validateEmittedOutput.ts` — update_validator_later (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateForms.ts` — keep
- **live** `packages/validation/src/generatedApp/validateGeneratedApp.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateGeneratedAppCommercialReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateGeneratedAppNoPlaceholders.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateIntegrations.ts` — keep
- **live** `packages/validation/src/generatedApp/validateNoPlaceholders.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/generatedApp/validateNotifications.ts` — keep
- **live** `packages/validation/src/generatedApp/validatePayments.ts` — keep
- **live** `packages/validation/src/generatedApp/validateResponsiveUi.ts` — keep
- **live** `packages/validation/src/generatedApp/validateRoutes.ts` — keep
- **live** `packages/validation/src/generatedApp/validateSecurity.ts` — keep
- **live** `packages/validation/src/generatedApp/validateSpecCompleteness.ts` — keep
- **live** `packages/validation/src/generatedApp/validateUxStates.ts` — keep
- **live** `packages/validation/src/generatedApp/validateWorkflows.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators.ts` — update_validator_later; replacement: `apps/control-plane/src/app/projects/[projectId]/page.tsx` (wording/demo hit)
- **live** `packages/validation/src/repoValidators/adaptiveRepairStrategyReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/autonomousComplexBuildReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/chatBehaviorExecution.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/claim99EntitlementReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/claimBoundaryReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/credentialedDeploymentReadiness.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators/dashboardRouteIntegrityReadiness.ts` — update_validator_later; replacement: `apps/control-plane/src/app/projects/[projectId]/page.tsx`
- **live** `packages/validation/src/repoValidators/deploymentDryRunReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/dirtyRepoRescueReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/domainQualityScorecardsReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/domainRuntimeCommandExecutionReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/editableUIDocumentModelReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/evalSuiteReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/evidencePath.ts` — keep
- **live** `packages/validation/src/repoValidators/externalIntegrationDeploymentReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/failureClassificationReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/finalCommercialReleaseEvidence.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/finalReleaseEvidenceLock.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/firstRunExperienceReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/generatedAppCommercialReadinessGateReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/generatedAppCorpusHarnessReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/generatedAppNoPlaceholderValidatorReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/generatedAppRepresentativeCorpusReadiness.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/repoValidators/generatedAppRuntimeSmokeReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/installerRuntimeReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/largeFileIntakeReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/liveDeploymentExecutionReadiness.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderAppStructureReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/liveUIBuilderCoreReadiness.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderDataStateApiWiringReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderDesignSystemReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/liveUIBuilderDirectManipulationReadiness.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderExportDeployReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderFullProjectGenerationReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderInteractionReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderInteractionUXReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/liveUIBuilderLocalApplyRollbackReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/liveUIBuilderLocalFileAdapterReadiness.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderMultiFilePlanningReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderOrchestrationReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderPlatformBuilderReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/liveUIBuilderReactSourcePatchReadiness.ts` — keep
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderReliabilityRepairReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/liveUIBuilderSafetyReadiness.ts` — keep
- **unknown** `packages/validation/src/repoValidators/liveUIBuilderScalabilityPerformanceReadiness.ts` — verify
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderSourceIdentityReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderSourceSyncReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderUXPolishReadiness.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/repoValidators/liveUIBuilderVisualReadiness.ts` — update_validator_later (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/repoValidators/localCrossPlatformLaunchReadiness.ts` — update_validator_later
- **live** `packages/validation/src/repoValidators/masterTruthSpecReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/maxPowerCompletionReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/multiDomainEmittedOutputReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/multiSourceIntakeReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/securityCenterReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/selfUpgradingFactoryReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/uiEditCommandParserReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/universalBuilderReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/universalCapabilityStressReadiness.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/repoValidators/uploadPlanHandoffReadiness.ts` — keep
- **live** `packages/validation/src/repoValidators/validationCacheReadiness.ts` — keep
- **live** `packages/validation/src/runner.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/runtime/builderQualityBenchmark.ts` — keep
- **live** `packages/validation/src/runtime/cli.ts` — keep
- **live** `packages/validation/src/runtime/credentialedDeploymentSchemas.ts` — keep
- **live** `packages/validation/src/runtime/deploymentProviderContracts.ts` — keep
- **live** `packages/validation/src/runtime/domainRuntimeCommandPolicy.ts` — keep
- **live** `packages/validation/src/runtime/domainRuntimeCommandRunner.ts` — keep
- **live** `packages/validation/src/runtime/externalDeploymentReadinessUtils.ts` — keep
- **live** `packages/validation/src/runtime/externalDeploymentSchemas.ts` — keep
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/next-app-basic/package.json` — verify
- **deprecated** `packages/validation/src/runtime/fixtures/generated-apps/next-app-basic/pages/index.js` — verify
- **live** `packages/validation/src/runtime/fixtures/generated-apps/static-html-basic/index.html` — keep
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/vite-react-basic/package-lock.json` — verify
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/vite-react-basic/package.json` — verify
- **deprecated** `packages/validation/src/runtime/fixtures/generated-apps/vite-react-basic/server.js` — verify
- **live** `packages/validation/src/runtime/gateNegativePaths.ts` — keep
- **live** `packages/validation/src/runtime/generatedAppRuntimeSmokeRunner.ts` — keep
- **live** `packages/validation/src/runtime/liveDeploymentExecutionSchemas.ts` — keep
- **live** `packages/validation/src/runtime/liveDeploymentProviderExecutionSchema.ts` — keep
- **live** `packages/validation/src/runtime/opsObservability.ts` — keep
- **live** `packages/validation/src/runtime/proofAdaptiveRepairStrategy.ts` — keep
- **live** `packages/validation/src/runtime/proofAll.ts` — keep
- **live** `packages/validation/src/runtime/proofAutobuild99Statistical.ts` — keep
- **live** `packages/validation/src/runtime/proofAutonomousComplexBuild.ts` — keep
- **live** `packages/validation/src/runtime/proofClaim99Entitlement.ts` — keep
- **live** `packages/validation/src/runtime/proofClaim99IndependentAudit.ts` — keep
- **live** `packages/validation/src/runtime/proofCredentialedDeploymentReadiness.ts` — keep
- **live** `packages/validation/src/runtime/proofDeploymentDryRun.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofDirtyRepo.ts` — update_validator_later
- **live** `packages/validation/src/runtime/proofDomainQualityScorecards.ts` — keep
- **live** `packages/validation/src/runtime/proofDomainRuntimeCommands.ts` — keep
- **live** `packages/validation/src/runtime/proofEvalSuite.ts` — keep
- **live** `packages/validation/src/runtime/proofExternalDeploymentReadiness.ts` — keep
- **live** `packages/validation/src/runtime/proofFast.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofGreenfield.ts` — update_validator_later
- **live** `packages/validation/src/runtime/proofHarness.ts` — keep
- **live** `packages/validation/src/runtime/proofIntakeProjectMutationContract.ts` — keep
- **live** `packages/validation/src/runtime/proofLargeFileIntake.ts` — keep
- **live** `packages/validation/src/runtime/proofLiveDeploymentExecutionReadiness.ts` — keep
- **live** `packages/validation/src/runtime/proofLiveDeploymentProviderExecution.ts` — keep
- **live** `packages/validation/src/runtime/proofLiveUISourceSyncBeforeExportLaunch.ts` — keep
- **live** `packages/validation/src/runtime/proofMaxPowerCompletion.ts` — keep
- **live** `packages/validation/src/runtime/proofMaxPowerDomainPermutations.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofMultiDomainEmittedOutput.ts` — update_validator_later
- **live** `packages/validation/src/runtime/proofMultiSourceIntake.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofNoDemoContamination.ts` — update_validator_later
- **live** `packages/validation/src/runtime/proofSecretsCredentialManagement.ts` — keep
- **stale_validator_reference** `packages/validation/src/runtime/proofSelfUpgrade.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/runtime/proofUniversalPipeline.ts` — update_validator_later
- **live** `packages/validation/src/runtime/secretsCredentialManagement.ts` — keep
- **live** `packages/validation/src/runtime/types.ts` — keep
- **live** `packages/validation/src/tests/adaptiveRepairStrategy.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/blueprintCoveragePhase2.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/buttonActionBinding.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/chatBehaviorExecutionValidator.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/chatDrivenControl.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/chatFirstOperatorRoutingValidator.test.ts` — keep
- **live** `packages/validation/src/tests/claim99EntitlementReadiness.test.ts` — keep
- **live** `packages/validation/src/tests/claimBoundaryReadiness.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/deployRouteGates.test.ts` — keep
- **live** `packages/validation/src/tests/dirtyRepoCompletionContractV2.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/dirtyRepoEvidence.test.ts` — keep
- **live** `packages/validation/src/tests/dirtyRepoRepairLoopProof.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/failureClassificationPolicy.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/finalReleaseEvidenceLock.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/generatedAppRuntimeSmokeRunner.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/largeFileIntake.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderAppStructurePanel.test.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderCommandInput.test.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderDiffPreview.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/liveUIBuilderDirectManipulationOverlay.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/liveUIBuilderDocumentRenderer.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/liveUIBuilderInspectOverlay.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderResolutionPanel.test.ts` — update_validator_later
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/liveUIBuilderVibeHook.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/liveUIBuilderVibePanel.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/liveUIBuilderVibePreviewSurface.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/localCrossPlatformLaunchReadiness.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/localExecutorArtifactMaterialization.test.ts` — update_validator_later
- **live** `packages/validation/src/tests/masterTruthSpecReadiness.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/multiSourceIntake.test.ts` — keep
- **live** `packages/validation/src/tests/operatorApprovalPolicyFlow.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/proDashboardTruthState.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx` (wording/demo hit)
- **live** `packages/validation/src/tests/secretLeakPrevention.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/uiRouteRegression.test.ts` — update_validator_later; replacement: `apps/control-plane/src/app/projects/[projectId]/page.tsx`
- **live** `packages/validation/src/tests/uploadPlanHandoff.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`
- **stale_validator_reference** `packages/validation/src/tests/wave027StatePersistenceResolution.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx` (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave028PanelTruthHardening.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx` (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave029RuntimePreviewCorrection.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`
- **stale_validator_reference** `packages/validation/src/tests/wave030ExecutionLayerActivation.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`
- **live** `packages/validation/src/tests/wave031FirstRunExperienceReality.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/wave032CommercialUiPolish.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`
- **stale_validator_reference** `packages/validation/src/tests/wave033ReferenceUiMatch.test.ts` — update_validator_later; replacement: `apps/control-plane/src/app/projects/[projectId]/page.tsx` (wording/demo hit)
- **live** `packages/validation/src/tests/wave034ReleaseCandidateAcceptanceAudit.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/wave035BackendProofRunnerContracts.test.ts` — keep (wording/demo hit)
- **live** `packages/validation/src/tests/wave036RunnerApiImplementation.test.ts` — keep
- **stale_validator_reference** `packages/validation/src/tests/wave037RuntimeControlImplementation.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx`
- **live** `packages/validation/src/tests/wave038LaunchProofDeployGating.test.ts` — keep (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave039EndToEndBrowserAcceptance.test.ts` — update_validator_later; replacement: `apps/control-plane/src/app/projects/[projectId]/page.tsx` (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave040PublicBetaReleaseGate.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx` (wording/demo hit)
- **stale_validator_reference** `packages/validation/src/tests/wave041PixelExactReferenceUi.test.ts` — update_validator_later; replacement: `apps/control-plane/src/components/vibe/VibeDashboard.tsx` (wording/demo hit)
- **live** `packages/validation/src/types.ts` — keep
- **unknown** `packages/validation/src/visual/proDashboard.spec.ts` — verify
- **deprecated** `packages/validation/src/visual/proDashboard.spec.ts-snapshots/pro-dashboard-linux.png` — verify
- **unknown** `packages/validation/src/visual/vibeDashboard.spec.ts` — verify
- **deprecated** `packages/validation/src/visual/vibeDashboard.spec.ts-snapshots/vibe-dashboard-linux.png` — verify
- **unknown** `receipts/beta-simulation/baseline/script-proof_claim-99-independent-audit.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_all.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_behavioral.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_changed.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_fast.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_observability.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/validate-all.exit` — verify
- **unknown** `receipts/lean-clean-green-20260501/fresh-main-validate-all.log` — verify
- **unknown** `receipts/lean-clean-green-20260501/origin-main-proof-head.txt` — verify
- **unknown** `receipts/lean-clean-green-20260501/proof-branch-status-before.txt` — verify (wording/demo hit)
- **unknown** `receipts/lean-clean-green-20260501/root-validate-all-check.json` — verify
- **unknown** `receipts/lean-clean-green-20260501/validate-all-locations.txt` — verify
- **unknown** `receipts/lean-clean-green-20260501/validate-script-fix.diff` — verify
- **unknown** `receipts/main-cleanup/validate-all-rerun.exit` — verify
- **unknown** `receipts/main-cleanup/validate-all.exit` — verify
- **live** `release-evidence/proof_profile.json` — keep (wording/demo hit)
- **live** `release-evidence/runtime/adaptive_repair_strategy_proof.json` — keep
- **live** `release-evidence/runtime/autobuild_99_statistical_proof.json` — keep
- **live** `release-evidence/runtime/autonomous_complex_build_readiness_proof.json` — keep
- **live** `release-evidence/runtime/claim_99_entitlement_proof.json` — keep
- **live** `release-evidence/runtime/credentialed_deployment_readiness_proof.json` — keep
- **live** `release-evidence/runtime/deployment_dry_run_proof.json` — keep
- **live** `release-evidence/runtime/dirty_repo_runtime_proof.json` — keep
- **live** `release-evidence/runtime/domain_runtime_command_execution_proof.json` — keep
- **live** `release-evidence/runtime/eval_suite_runtime_proof.json` — keep
- **live** `release-evidence/runtime/external_integration_deployment_readiness_proof.json` — keep
- **live** `release-evidence/runtime/greenfield_runtime_proof.json` — keep
- **live** `release-evidence/runtime/intake_project_mutation_contract_proof.json` — keep
- **live** `release-evidence/runtime/large_file_intake_readiness_proof.json` — keep
- **live** `release-evidence/runtime/live_deployment_execution_readiness_proof.json` — keep
- **live** `release-evidence/runtime/live_deployment_provider_execution_proof.json` — keep
- **live** `release-evidence/runtime/live_ui_source_sync_before_export_launch_proof.json` — keep
- **live** `release-evidence/runtime/max_power_completion_proof.json` — keep
- **live** `release-evidence/runtime/multi_domain_emitted_output_proof.json` — keep
- **live** `release-evidence/runtime/multi_source_intake_readiness_proof.json` — keep
- **live** `release-evidence/runtime/secrets_credential_management_readiness_proof.json` — keep
- **live** `release-evidence/runtime/self_upgrade_runtime_proof.json` — keep
- **live** `release-evidence/runtime/universal_pipeline_runtime_proof.json` — keep

Stale validation checks should be updated later. Checks for deleted ProDashboard and old `/vibe` route are stale validator references, not proof the current canonical Vibe route is wrong.

## 9. Styles/CSS map
- Live stylesheets detected: `apps/control-plane/src/styles/globals.css`, `apps/control-plane/src/styles/tokens.css`, `apps/control-plane/src/styles/app.css`.
- Duplicate/conflict risk: recent history shows an `.app-shell` conflict was fixed; keep all three until visual regression proof confirms consolidation.
- Deleted/replaced commercial workspace CSS: no tracked `commercial-workspace.css` equivalent was detected by filename.
- Cleanup candidates: consolidate only with visual tests/screenshots; do not delete CSS solely on import heuristics.

## 10. Demo/seed/fake/placeholder map
Files containing demo/seed/fake/mock/placeholder/coming soon/TODO/FIXME/commercial overclaim terms (capped at 500):
- `GENERATED_APP_ENTERPRISE_RUBRIC.md` — safe/verify by context
- `LAUNCH_BLOCKERS.md` — safe/verify by context
- `FINAL_ENTERPRISE_SELLABILITY_AUDIT.md` — safe/verify by context
- `VALIDATION_MATRIX.md` — safe/verify by context
- `DOMAIN_BUILDER_REGISTRY.md` — safe/verify by context
- `README.md` — safe/verify by context
- `package.json` — safe/verify by context
- `BOTOMATIC_FINAL_CLOSURE_PROGRAM.md` — safe/verify by context
- `release-evidence/rc/WAVE-034_RELEASE_CANDIDATE_ACCEPTANCE_AUDIT.md` — safe/verify by context
- `release-evidence/rc/WAVE-040_PUBLIC_BETA_RELEASE_GATE.md` — safe/verify by context
- `MASTER_TRUTH_SPEC.md` — safe/verify by context
- `release-evidence/rc/WAVE-041_PIXEL_EXACT_REFERENCE_UI_FINAL.md` — safe/verify by context
- `MAX_POWER_COMPLETION_PROGRAM.md` — safe/verify by context
- `release-evidence/rc/WAVE-039_END_TO_END_BROWSER_ACCEPTANCE.md` — safe/verify by context
- `ISSUE_STACK.md` — safe/verify by context
- `FINAL_VISUAL_DESIGN_PHASE.md` — safe/verify by context
- `BOTOMATIC_BUILD_DISCIPLINE.md` — safe/verify by context
- `tests/e2e/beta-owner-launch.spec.ts` — safe/verify by context
- `tests/fixtures/builder-forensic-corpus.json` — safe/verify by context
- `install/README_INSTALL.md` — safe/verify by context
- `EVIDENCE_BOUNDARY_POLICY.md` — safe/verify by context
- `tests/commercial/commercial-cockpit-static.test.cjs` — safe/verify by context
- `release-evidence/generated-apps/mobile_app/domain_readiness.json` — safe/verify by context
- `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/app/page.tsx` — safe/verify by context
- `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/package.json` — safe/verify by context
- `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/README.md` — safe/verify by context
- `receipts/final-verdict.md` — safe/verify by context
- `receipts/repo-cleanup/final-cleanup.json` — safe/verify by context
- `release-evidence/generated-apps/mobile_app/deploy/deployment_readiness.json` — safe/verify by context
- `apps/orchestrator-api/src/bootstrap.ts` — safe/verify by context
- `receipts/repo-cleanup/final-cleanup.md` — safe/verify by context
- `receipts/repo-cleanup/post-merge-finalization.md` — safe/verify by context
- `fixtures/generated-app-corpus/representative/manifest.json` — safe/verify by context
- `receipts/repair-self-healing/summary.md` — safe/verify by context
- `release-evidence/generated-apps/api_service/domain_readiness.json` — safe/verify by context
- `receipts/repair-self-healing/top-blockers.md` — safe/verify by context
- `receipts/repair-self-healing/repair-flow-inventory.md` — safe/verify by context
- `receipts/repair-self-healing/summary.json` — safe/verify by context
- `release-evidence/generated-apps/api_service/deploy/deployment_readiness.json` — safe/verify by context
- `apps/orchestrator-api/src/server.ts` — safe/verify by context
- `release-evidence/generated-apps/bot/domain_readiness.json` — safe/verify by context
- `apps/orchestrator-api/src/server_app.ts` — safe/verify by context
- `PRODUCT_SCOPE.md` — safe/verify by context
- `ENTERPRISE_LAUNCH_RUBRIC.md` — safe/verify by context
- `release-evidence/generated-apps/bot/deploy/deployment_readiness.json` — safe/verify by context
- `BLUEPRINT_REGISTRY.md` — safe/verify by context
- `release-evidence/manifest.json` — safe/verify by context
- `ENTERPRISE_AUTH_AND_GATE_PLAN.md` — safe/verify by context
- `release-evidence/proof_profile.json` — safe/verify by context
- `release-evidence/README.md` — safe/verify by context
- `FINAL_LAUNCH_READINESS_CRITERIA.md` — safe/verify by context
- `apps/control-plane/src/styles/globals.css` — risky if live/customer-facing
- `receipts/pr-triage/final-pr-triage-receipt.md` — safe/verify by context
- `apps/control-plane/src/styles/app.css` — risky if live/customer-facing
- `release-evidence/generated-apps/marketing_website/deploy/deployment_readiness.json` — safe/verify by context
- `release-evidence/generated-apps/dirty_repo_completion/domain_readiness.json` — safe/verify by context
- `release-evidence/generated-apps/marketing_website/domain_readiness.json` — safe/verify by context
- `package-lock.json` — safe/verify by context
- `docs/gate6/GATE6_RUNTIME_PROOF_2026-04-23.md` — safe/verify by context
- `NO_PLACEHOLDER_POLICY.md` — safe/verify by context
- `docs/generated-app-no-placeholder-validator.md` — safe/verify by context
- `apps/control-plane/src/app/projects/new/page.tsx` — risky if live/customer-facing
- `receipts/builder-forensic/summary.md` — safe/verify by context
- `release-evidence/generated-apps/dirty_repo_completion/launch/deployment_readiness.json` — safe/verify by context
- `docs/gate4/GATE4_RUNTIME_PROOF_2026-04-23.md` — safe/verify by context
- `receipts/beta-simulation/final-owner-verdict.md` — safe/verify by context
- `receipts/builder-forensic/summary.json` — safe/verify by context
- `docs/generated-app-corpus-harness.md` — safe/verify by context
- `receipts/builder-forensic/capability-matrix.csv` — safe/verify by context
- `docs/generated-app-commercial-readiness-gate.md` — safe/verify by context
- `receipts/final-remediation-commit-20260501/secret-scan.txt` — safe/verify by context
- `docs/secret-leak-prevention.md` — safe/verify by context
- `receipts/final-remediation-commit-20260501/final-remediation-verdict.md` — safe/verify by context
- `receipts/final-remediation-commit-20260501/beta-simulation-report.md` — safe/verify by context
- `docs/gate5/GATE5_RUNTIME_PROOF_2026-04-23.md` — safe/verify by context
- `receipts/final-remediation-commit-20260501/initial-git-status.txt` — safe/verify by context
- `receipts/final-remediation-commit-20260501/final-commit-receipt.md` — safe/verify by context
- `packages/executor-adapters/src/claudeCodeExecutor.ts` — safe/verify by context
- `docs/generated-app-representative-corpus.md` — safe/verify by context
- `docs/gate3/GATE3_RUNTIME_PROOF_2026-04-23.md` — safe/verify by context
- `packages/executor-adapters/src/mockExecutor.ts` — safe/verify by context
- `docs/reference-ui/README.md` — safe/verify by context
- `docs/rc/WAVE-035_BACKEND_PROOF_AND_RUNNER_CONTRACTS.md` — safe/verify by context
- `apps/control-plane/src/app/api/local-repo-dashboard/stream/route.ts` — safe/verify by context
- `docs/live-ui-builder-behavioral-gap-baseline.md` — safe/verify by context
- `docs/final-release-evidence-lock.md` — safe/verify by context
- `docs/universal-builder/DOMAIN_LAUNCH_RUBRICS.md` — safe/verify by context
- `docs/gate7/GATE7_VALIDATION_DEPTH_PROOF_2026-04-23.md` — safe/verify by context
- `docs/gate7/GATE7_FINAL_CLOSURE_AUDIT_2026-04-23.md` — safe/verify by context
- `release-evidence/generated-apps/web_saas_app/domain_readiness.json` — safe/verify by context
- `docs/gate7/PRODUCTION_PROOF_PROFILE_2026-04-23.md` — safe/verify by context
- `docs/gate7/OBSERVABILITY_HARDENING_RUNTIME_PROOF_2026-04-23.md` — safe/verify by context
- `release-evidence/generated-apps/web_saas_app/deploy/deployment_readiness.json` — safe/verify by context
- `LEGAL_CLAIM_BOUNDARIES.md` — safe/verify by context
- `apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts` — safe/verify by context
- `UNIVERSAL_BUILDER_TARGET.md` — safe/verify by context
- `apps/control-plane/src/server/launchProofStore.ts` — safe/verify by context
- `GENERATED_APP_VALIDATION_MATRIX.md` — safe/verify by context
- `receipts/main-cleanup/step8-git-diff.patch` — safe/verify by context
- `apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts` — safe/verify by context
- `receipts/lean-clean-green-20260501/npm-run-root.txt` — safe/verify by context
- `packages/packet-engine/src/generator.ts` — safe/verify by context
- `receipts/main-cleanup/secret-scan-summary.md` — safe/verify by context
- `receipts/lean-clean-green-20260501/initial-status.txt` — safe/verify by context
- `apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts` — safe/verify by context
- `receipts/lean-clean-green-20260501/root-package-scripts.json` — safe/verify by context
- `receipts/lean-clean-green-20260501/status-after-local-junk-clean.txt` — safe/verify by context
- `packages/trigger-adapter/src/mockRunner.ts` — safe/verify by context
- `receipts/main-cleanup/final-clean-main-receipt.md` — safe/verify by context
- `apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts` — safe/verify by context
- `receipts/lean-clean-green-20260501/secret-scan.txt` — safe/verify by context
- `receipts/final-qa/qa-summary.json` — safe/verify by context
- `apps/control-plane/src/services/autonomousBuild.ts` — safe/verify by context
- `receipts/final-qa/qa-summary.md` — safe/verify by context
- `receipts/lean-clean-green-20260501/final-lean-clean-green-receipt.md` — safe/verify by context
- `packages/repo-repair/src/failureClassifier.ts` — safe/verify by context
- `packages/ui-blueprint-registry/src/tests/registry.test.ts` — safe/verify by context
- `apps/control-plane/src/services/api.ts` — safe/verify by context
- `apps/control-plane/src/services/demoMode.ts` — safe/verify by context
- `packages/repo-repair/src/completionPlanner.ts` — safe/verify by context
- `packages/ui-blueprint-registry/src/index.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/PacketPanel.tsx` — risky if live/customer-facing
- `receipts/lean-clean-green-20260501/secret-scan-resolution.md` — safe/verify by context
- `apps/control-plane/src/services/proof.ts` — safe/verify by context
- `packages/validation/src/existingRepo/validateRepoNoPlaceholders.ts` — safe/verify by context
- `receipts/lean-clean-green-20260501/proof-branch-status-before.txt` — safe/verify by context
- `apps/control-plane/src/components/overview/LaunchReadinessPanel.tsx` — risky if live/customer-facing
- `packages/validation/src/existingRepo/validateExistingRepoReadiness.ts` — safe/verify by context
- `apps/control-plane/src/components/chat/ConversationPane.tsx` — safe/verify by context
- `apps/control-plane/src/components/chat/intakePipeline.ts` — safe/verify by context
- `apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts` — risky if live/customer-facing
- `packages/validation/src/existingRepo/index.ts` — safe/verify by context
- `packages/repo-completion/src/dirtyRepoRepairLoop.ts` — safe/verify by context
- `packages/validation/src/existingRepo/validateRepoSecurity.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/RepoRescuePanel.tsx` — risky if live/customer-facing
- `apps/control-plane/src/components/chat/Composer.tsx` — safe/verify by context
- `packages/domain-builders/src/registry.ts` — safe/verify by context
- `packages/repo-completion/src/completionRunner.ts` — safe/verify by context
- `apps/control-plane/src/components/vibe/VibeDashboard.tsx` — risky if live/customer-facing
- `packages/validation/src/runner.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/AutonomousBuildRunPanel.tsx` — risky if live/customer-facing
- `packages/domain-builders/src/types.ts` — safe/verify by context
- `apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDirectManipulationOverlay.tsx` — safe/verify by context
- `apps/control-plane/src/components/overview/SelfUpgradePanel.tsx` — risky if live/customer-facing
- `apps/control-plane/src/components/live-ui-builder/LiveUIBuilderDocumentRenderer.tsx` — safe/verify by context
- `apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx` — safe/verify by context
- `packages/validation/src/tests/claimBoundaryReadiness.test.ts` — safe/verify by context
- `packages/repo-intake/src/repoClassifier.ts` — safe/verify by context
- `apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx` — safe/verify by context
- `packages/validation/src/tests/wave040PublicBetaReleaseGate.test.ts` — safe/verify by context
- `packages/github-adapter/src/mockGithub.ts` — safe/verify by context
- `packages/validation/src/generatedApp/validateGeneratedAppNoPlaceholders.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/DeploymentPanel.tsx` — risky if live/customer-facing
- `packages/validation/src/tests/proDashboardTruthState.test.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx` — risky if live/customer-facing
- `apps/control-plane/src/components/shell/AppShell.tsx` — risky if live/customer-facing
- `apps/control-plane/src/components/overview/SecurityCenterPanel.tsx` — risky if live/customer-facing
- `packages/autonomous-build/src/finalReleaseAssembler.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/FirstRunWhatsNextPanel.tsx` — risky if live/customer-facing
- `packages/repo-intake/src/dirtyRepoEvidence.ts` — safe/verify by context
- `packages/validation/src/tests/wave028PanelTruthHardening.test.ts` — safe/verify by context
- `packages/repo-intake/src/riskScanner.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/generatedAppNoPlaceholders.test.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/generatedAppRepresentativeCorpus.test.ts` — safe/verify by context
- `release-evidence/generated-apps/ai_agent/domain_readiness.json` — safe/verify by context
- `packages/validation/src/tests/liveUIBuilderDocumentRenderer.test.ts` — safe/verify by context
- `packages/spec-engine/src/tests/buildContract.test.ts` — safe/verify by context
- `packages/spec-engine/src/tests/specEngine.test.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/BuildStatusRail.tsx` — risky if live/customer-facing
- `packages/validation/src/tests/secretLeakPrevention.test.ts` — safe/verify by context
- `apps/control-plane/src/components/overview/IntakeHubPanel.tsx` — risky if live/customer-facing
- `packages/validation/src/generatedApp/tests/generatedAppCommercialReadiness.test.ts` — safe/verify by context
- `apps/control-plane/src/components/pro/proSeedData.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/generatedAppCorpusHarness.test.ts` — safe/verify by context
- `packages/autonomous-build/src/milestonePlanner.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/noPlaceholder.test.ts` — safe/verify by context
- `packages/autonomous-build/src/repairStrategyRegistry.ts` — safe/verify by context
- `packages/autonomous-build/src/checkpointStore.ts` — safe/verify by context
- `packages/autonomous-build/src/index.ts` — safe/verify by context
- `scripts/builder-forensic/run.mjs` — safe/verify by context
- `release-evidence/generated-apps/ai_agent/deploy/deployment_readiness.json` — safe/verify by context
- `scripts/forensic/routes-commercial.mjs` — safe/verify by context
- `scripts/builder-forensic/repair-engine.mjs` — safe/verify by context
- `scripts/builder-forensic/report.mjs` — safe/verify by context
- `packages/validation/src/generatedApp/corpusHarness.ts` — safe/verify by context
- `scripts/beta-simulation.mjs` — safe/verify by context
- `scripts/builder-forensic/corpus.mjs` — safe/verify by context
- `packages/validation/src/generatedApp/validateGeneratedAppCommercialReadiness.ts` — safe/verify by context
- `packages/validation/src/generatedApp/validateEmittedOutput.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/manifest.json` — safe/verify by context
- `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/app/page.tsx` — safe/verify by context
- `packages/autonomous-build/src/buildOrchestrator.ts` — safe/verify by context
- `packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/placeholder-blocked/package.json` — safe/verify by context
- `packages/autonomous-build/src/adaptiveStrategySelector.ts` — safe/verify by context
- `packages/validation/src/generatedApp/validateGeneratedApp.ts` — safe/verify by context
- `packages/validation/src/tests/liveUIBuilderVibeHook.test.ts` — safe/verify by context
- `scripts/builder-forensic/repair-harness.mjs` — safe/verify by context
- `packages/validation/src/tests/wave034ReleaseCandidateAcceptanceAudit.test.ts` — safe/verify by context
- `packages/validation/src/tests/uploadPlanHandoff.test.ts` — safe/verify by context
- `packages/autonomous-build/src/specIngestion.ts` — safe/verify by context
- `packages/validation/src/tests/wave027StatePersistenceResolution.test.ts` — safe/verify by context
- `packages/validation/src/tests/adaptiveRepairStrategy.test.ts` — safe/verify by context
- `packages/repo-audit/src/index.ts` — safe/verify by context
- `packages/validation/src/tests/masterTruthSpecReadiness.test.ts` — safe/verify by context
- `packages/validation/src/tests/liveUIBuilderDirectManipulationOverlay.test.ts` — safe/verify by context
- `packages/validation/src/tests/dirtyRepoCompletionContractV2.test.ts` — safe/verify by context
- `packages/validation/src/tests/finalReleaseEvidenceLock.test.ts` — safe/verify by context
- `packages/validation/src/tests/wave035BackendProofRunnerContracts.test.ts` — safe/verify by context
- `packages/validation/src/tests/liveUIBuilderVibePreviewSurface.test.ts` — safe/verify by context
- `packages/validation/src/generatedApp/validateNoPlaceholders.ts` — safe/verify by context
- `packages/autonomous-build/src/failurePolicy.ts` — safe/verify by context
- `packages/validation/src/tests/wave041PixelExactReferenceUi.test.ts` — safe/verify by context
- `packages/repo-audit/src/placeholderAudit.ts` — safe/verify by context
- `packages/validation/src/tests/chatDrivenControl.test.ts` — safe/verify by context
- `packages/validation/src/tests/wave033ReferenceUiMatch.test.ts` — safe/verify by context
- `packages/validation/src/repoValidators.ts` — safe/verify by context
- `release-evidence/generated-apps/game/domain_readiness.json` — safe/verify by context
- `packages/validation/src/generatedApp/validateCommercialReadiness.ts` — safe/verify by context
- `packages/validation/src/tests/failureClassificationPolicy.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiFullProjectGenerationPlan.ts` — safe/verify by context
- `packages/supabase-adapter/src/jobClient.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiPlatformCapabilityPlanner.ts` — safe/verify by context
- `packages/ui-preview-engine/README.md` — safe/verify by context
- `packages/ui-preview-engine/src/uiProjectPathNormalizer.ts` — safe/verify by context
- `packages/validation/src/tests/wave039EndToEndBrowserAcceptance.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiDocumentModel.ts` — safe/verify by context
- `packages/validation/src/tests/wave038LaunchProofDeployGating.test.ts` — safe/verify by context
- `release-evidence/generated-apps/game/deploy/deployment_readiness.json` — safe/verify by context
- `packages/validation/src/tests/dirtyRepoRepairLoopProof.test.ts` — safe/verify by context
- `packages/validation/src/repoValidators/externalIntegrationDeploymentReadiness.ts` — safe/verify by context
- `packages/validation/src/tests/chatBehaviorExecutionValidator.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/index.ts` — safe/verify by context
- `packages/validation/src/repoValidators/universalBuilderReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiDirectManipulationModel.ts` — safe/verify by context
- `packages/validation/src/repoValidators/autonomousComplexBuildReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/livePreviewPatch.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiDirectManipulationMutation.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiDocumentDiff.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiDataStateApiWiringPlanner.ts` — safe/verify by context
- `packages/validation/src/repoValidators/chatBehaviorExecution.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiEditGuardrails.ts` — safe/verify by context
- `packages/validation/src/repoValidators/universalCapabilityStressReadiness.ts` — safe/verify by context
- `packages/validation/src/repoValidators/dirtyRepoRescueReadiness.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/supportHelpdesk.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiPreviewInteractionAdapter.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/crm.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiSourceApplyTransaction.ts` — safe/verify by context
- `packages/validation/src/repoValidators/multiDomainEmittedOutputReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiEditWorkflow.ts` — safe/verify by context
- `packages/validation/src/repoValidators/maxPowerCompletionReadiness.ts` — safe/verify by context
- `packages/validation/src/repoValidators/liveUIBuilderVisualReadiness.ts` — safe/verify by context
- `packages/validation/src/repoValidators/finalCommercialReleaseEvidence.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/realEstateListings.ts` — safe/verify by context
- `packages/blueprints/src/autonomousBuilderRegistry.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/customerPortal.ts` — safe/verify by context
- `packages/validation/src/repoValidators/generatedAppRepresentativeCorpusReadiness.ts` — safe/verify by context
- `packages/validation/src/repoValidators/finalReleaseEvidenceLock.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiSourceSyncPlan.ts` — safe/verify by context
- `packages/blueprints/src/tests/registry.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiMutationEngine.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiDocumentModel.test.ts` — safe/verify by context
- `packages/validation/src/repoValidators/domainRuntimeCommandExecutionReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiAppStructureMutation.ts` — safe/verify by context
- `packages/validation/src/repoValidators/claimBoundaryReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiAppStructureMutation.test.ts` — safe/verify by context
- `packages/validation/src/repoValidators/generatedAppNoPlaceholderValidatorReadiness.ts` — safe/verify by context
- `packages/validation/src/repoValidators/adaptiveRepairStrategyReadiness.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/ecommerce.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiFullProjectGenerator.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/aiAgentWorkflowApp.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiMutationEngine.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/workflowSystem.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiPreviewEngine.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/lms.ts` — safe/verify by context
- `packages/validation/src/repoValidators/generatedAppCommercialReadinessGateReadiness.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiSourceApplyTransaction.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/livePreviewPatch.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiEditWorkflow.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiEditHistory.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiDirectManipulationMutation.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiSourceApply.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiRouteTemplate.test.ts` — safe/verify by context
- `packages/validation/src/repoValidators/masterTruthSpecReadiness.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/marketingWebsite.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/internalAdminTool.ts` — safe/verify by context
- `packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/nonprofitVolunteerOps.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/landingPage.ts` — safe/verify by context
- `packages/blueprints/src/types.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/aiChatbotApp.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiEditHistory.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/saasDashboard.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/booking.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/campaignOps.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/marketplace.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/fieldService.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/directory.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/analyticsReporting.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiProjectPathNormalizer.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/jobBoard.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/membershipCommunity.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/eventPlatform.ts` — safe/verify by context
- `packages/validation/src/repoValidators/liveDeploymentExecutionReadiness.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/documentProcessing.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiEditGuardrails.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/contentMediaSite.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiPreviewInteractionAdapter.test.ts` — safe/verify by context
- `packages/ui-preview-engine/src/tests/uiPlatformBuilderPlanner.test.ts` — safe/verify by context
- `packages/blueprints/src/blueprints/inventoryOrderManagement.ts` — safe/verify by context
- `packages/ui-preview-engine/src/uiFullProjectGenerator.ts` — safe/verify by context

Test fixtures and prohibited-example docs are safe by context; customer-facing UI, README/marketing docs, release docs, and service messages are risky and should be wording-reviewed.

## 11. Package scripts and tooling map
| Script | Command | Observed status |
| --- | --- | --- |
| build | `npm run ui:build` | pass |
| api:start | `PORT=3001 tsx apps/orchestrator-api/src/bootstrap.ts` | not run |
| api:dev | `PORT=3001 tsx apps/orchestrator-api/src/bootstrap.ts` | not run |
| doctor | `tsx scripts/doctor.ts` | not run |
| start:easy | `tsx scripts/startEasy.ts` | not run |
| start:easy:dry-run | `tsx scripts/startEasy.ts --dry-run` | not run |
| ui:dev | `npm --prefix apps/control-plane run dev` | not run |
| ui:build | `npm --prefix apps/control-plane run build` | not run |
| ui:start | `npm --prefix apps/control-plane run start` | not run |
| control-plane:dev | `concurrently "npm run api:dev" "npm run ui:dev"` | not run |
| validate:all | `tsx packages/validation/src/cli.ts` | fail |
| validate:fast | `tsx packages/validation/src/cli.ts --fast` | not run |
| validate:changed | `tsx packages/validation/src/cli.ts --changed` | not run |
| validate:behavioral | `tsx packages/validation/src/runtime/cli.ts` | not run |
| validate:observability | `tsx packages/validation/src/runtime/opsObservability.ts` | not run |
| cache:clear | `tsx packages/validation/src/cache/clearCache.ts` | not run |
| benchmark:builder | `tsx packages/validation/src/runtime/builderQualityBenchmark.ts` | not run |
| proof:greenfield | `tsx packages/validation/src/runtime/proofGreenfield.ts` | not run |
| proof:dirty-repo | `tsx packages/validation/src/runtime/proofDirtyRepo.ts` | not run |
| proof:self-upgrade | `tsx packages/validation/src/runtime/proofSelfUpgrade.ts` | not run |
| proof:universal-pipeline | `tsx packages/validation/src/runtime/proofUniversalPipeline.ts` | not run |
| proof:domain-scorecards | `tsx packages/validation/src/runtime/proofDomainQualityScorecards.ts` | not run |
| proof:eval-suite | `tsx packages/validation/src/runtime/proofEvalSuite.ts` | not run |
| proof:multi-domain-emitted-output | `tsx packages/validation/src/runtime/proofMultiDomainEmittedOutput.ts` | not run |
| proof:domain-runtime-commands | `tsx packages/validation/src/runtime/proofDomainRuntimeCommands.ts` | not run |
| proof:external-deployment-readiness | `tsx packages/validation/src/runtime/proofExternalDeploymentReadiness.ts` | not run |
| proof:deployment-dry-run | `tsx packages/validation/src/runtime/proofDeploymentDryRun.ts` | not run |
| proof:credentialed-deployment-readiness | `tsx packages/validation/src/runtime/proofCredentialedDeploymentReadiness.ts` | not run |
| proof:live-deployment-execution-readiness | `tsx packages/validation/src/runtime/proofLiveDeploymentExecutionReadiness.ts` | not run |
| proof:secrets-credential-management | `tsx packages/validation/src/runtime/proofSecretsCredentialManagement.ts` | not run |
| proof:autonomous-complex-build | `tsx packages/validation/src/runtime/proofAutonomousComplexBuild.ts` | not run |
| proof:adaptive-repair-strategy | `tsx packages/validation/src/runtime/proofAdaptiveRepairStrategy.ts` | not run |
| proof:large-file-intake | `tsx packages/validation/src/runtime/proofLargeFileIntake.ts` | not run |
| proof:multi-source-intake | `tsx packages/validation/src/runtime/proofMultiSourceIntake.ts` | not run |
| proof:fast | `tsx packages/validation/src/runtime/proofFast.ts` | not run |
| proof:all | `tsx packages/validation/src/runtime/proofAll.ts` | not run |
| test:spec-engine | `tsx packages/spec-engine/src/tests/specEngine.test.ts` | not run |
| test:build-contract | `tsx packages/spec-engine/src/tests/buildContract.test.ts` | not run |
| test:blueprints | `tsx packages/blueprints/src/tests/registry.test.ts` | not run |
| test:domain-builders | `tsx packages/domain-builders/src/tests/registry.test.ts` | not run |
| test:proof-engine | `tsx packages/proof-engine/src/tests/claimVerifier.test.ts` | not run |
| test:self-upgrade | `tsx packages/self-upgrade-engine/src/tests/selfUpgrade.test.ts` | not run |
| test:no-placeholder | `tsx packages/validation/src/generatedApp/tests/noPlaceholder.test.ts` | not run |
| test:large-file-intake | `tsx packages/validation/src/tests/largeFileIntake.test.ts` | not run |
| test:multi-source-intake | `tsx packages/validation/src/tests/multiSourceIntake.test.ts` | not run |
| test:chat-driven-control | `tsx packages/validation/src/tests/chatDrivenControl.test.ts` | not run |
| test:chat-routing-validator | `tsx packages/validation/src/tests/chatFirstOperatorRoutingValidator.test.ts` | not run |
| test:chat-behavior-execution-validator | `tsx packages/validation/src/tests/chatBehaviorExecutionValidator.test.ts` | not run |
| test:operator-approval-policy | `tsx packages/validation/src/tests/operatorApprovalPolicyFlow.test.ts` | not run |
| test:failure-classification-policy | `tsx packages/validation/src/tests/failureClassificationPolicy.test.ts` | not run |
| test:adaptive-repair-strategy | `tsx packages/validation/src/tests/adaptiveRepairStrategy.test.ts` | not run |
| test:upload-plan-handoff | `tsx packages/validation/src/tests/uploadPlanHandoff.test.ts` | not run |
| test:universal | `npm run -s test:spec-engine && npm run -s test:build-contract && npm run -s test:blueprints && npm run -s test:domain-builders && npm run -s test:proof-engine && npm run -s test:self-upgrade && npm run -s test:no-placeholder && npm run -s test:generated-app-no-placeholders && npm run -s test:generated-app-commercial-readiness && npm run -s test:generated-app-corpus && npm run -s test:generated-app-representative-corpus && npm run -s test:large-file-intake && npm run -s test:multi-source-intake && npm run -s test:chat-driven-control && npm run -s test:chat-routing-validator && npm run -s test:chat-behavior-execution-validator && npm run -s test:operator-approval-policy && npm run -s test:failure-classification-policy && npm run -s test:adaptive-repair-strategy && npm run -s test:upload-plan-handoff && npm run -s test:claim-boundary-readiness && npm run -s test:ui-routes && npm run -s test:ui-blueprints && npm run -s test:ui-preview-engine && npm run -s test:ui-document-model && npm run -s test:secret-leak-prevention && npm run -s test:dirty-repo-evidence && npm run -s test:dirty-repo-completion-v2 && npm run -s test:deploy-route-gates && npm run -s test:dirty-repo-repair-loop-proof && npm run -s test:final-release-evidence-lock && npm run -s test:master-truth-spec-readiness && npm run -s test:ui-edit-command && npm run -s test:ui-selection-state && npm run -s test:ui-target-resolver && npm run -s test:live-preview-patch && npm run -s test:ui-mutation-engine && npm run -s test:ui-edit-history && npm run -s test:ui-document-diff && npm run -s test:ui-edit-guardrails && npm run -s test:ui-source-sync-plan && npm run -s test:ui-edit-workflow && npm run -s test:ui-preview-interaction-state && npm run -s test:ui-preview-interaction-adapter && npm run -s test:ui-preview-review-payload && npm run -s test:ui-preview-interaction-fixture && npm run -s test:live-ui-builder-vibe-panel && npm run -s test:live-ui-builder-vibe-hook && npm run -s test:live-ui-builder-vibe-preview-surface && npm run -s test:live-ui-builder-document-renderer && npm run -s test:live-ui-builder-inspect-overlay && npm run -s test:live-ui-builder-command-input && npm run -s test:live-ui-builder-resolution-panel && npm run -s test:live-ui-builder-diff-preview && npm run -s test:ui-source-file-mapping && npm run -s test:ui-source-patch && npm run -s test:ui-react-source-analyzer && npm run -s test:ui-react-source-patch && npm run -s test:ui-route-template && npm run -s test:ui-local-file-adapter && npm run -s test:ui-source-apply && npm run -s test:ui-source-apply-transaction && npm run -s test:ui-source-apply-proof && npm run -s test:ui-source-round-trip && npm run -s test:ui-multi-file-edit-plan && npm run -s test:ui-cross-component-edit-planner && npm run -s test:live-ui-builder-source-sync-panel && npm run -s test:ui-app-structure-model && npm run -s test:ui-app-structure-command && npm run -s test:ui-app-structure-mutation && npm run -s test:live-ui-builder-app-structure-panel && npm run -s test:ui-direct-manipulation-model && npm run -s test:ui-direct-manipulation-mutation && npm run -s test:live-ui-builder-direct-manipulation-overlay && npm run -s test:ui-source-identity-model && npm run -s test:ui-source-identity-tracker && npm run -s test:ui-project-path-normalizer && npm run -s test:ui-full-project-generation-plan && npm run -s test:ui-full-project-generator && npm run -s test:ui-design-token-model && npm run -s test:ui-design-token-normalizer && npm run -s test:ui-style-control-plan && npm run -s test:ui-style-control-planner && npm run -s test:ui-data-state-api-wiring-model && npm run -s test:ui-data-state-api-wiring-normalizer && npm run -s test:ui-data-state-api-wiring-planner && npm run -s test:ui-reliability-repair-model && npm run -s test:ui-reliability-failure-classifier && npm run -s test:ui-reliability-repair-planner && npm run -s test:ui-builder-ux-control-model && npm run -s test:ui-builder-ux-control-planner && npm run -s test:ui-export-deploy-model && npm run -s test:ui-export-bundle-planner && npm run -s test:ui-deploy-target-planner && npm run -s test:ui-export-deploy-planner && npm run -s test:ui-platform-builder-model && npm run -s test:ui-platform-target-normalizer && npm run -s test:ui-platform-capability-planner && npm run -s test:ui-platform-builder-planner && npm run -s test:ui-live-builder-orchestration-model && npm run -s test:ui-live-builder-orchestration-planner && npm run -s test:ui-live-builder-orchestration-graph-verifier && npm run -s test:local-cross-platform-launch-readiness && npm run -s test:generated-app-runtime-smoke-runner` | not run |
| test:claim-boundary-readiness | `tsx packages/validation/src/tests/claimBoundaryReadiness.test.ts` | not run |
| test:ui-routes | `tsx packages/validation/src/tests/uiRouteRegression.test.ts` | not run |
| test:ui-blueprints | `tsx packages/ui-blueprint-registry/src/tests/registry.test.ts` | not run |
| test:ui-preview-engine | `tsx packages/ui-preview-engine/src/tests/uiPreviewEngine.test.ts && npm run -s test:ui-live-builder-orchestration-model && npm run -s test:ui-live-builder-orchestration-planner && npm run -s test:ui-live-builder-orchestration-graph-verifier && npm run -s test:ui-generated-app-runtime-smoke-model && npm run -s test:ui-generated-app-runtime-smoke-planner` | not run |
| test:generated-app-no-placeholders | `tsx packages/validation/src/generatedApp/tests/generatedAppNoPlaceholders.test.ts` | not run |
| test:generated-app-commercial-readiness | `tsx packages/validation/src/generatedApp/tests/generatedAppCommercialReadiness.test.ts` | not run |
| test:generated-app-corpus | `tsx packages/validation/src/generatedApp/tests/generatedAppCorpusHarness.test.ts` | not run |
| test:generated-app-representative-corpus | `tsx packages/validation/src/generatedApp/tests/generatedAppRepresentativeCorpus.test.ts` | not run |
| test:secret-leak-prevention | `tsx packages/validation/src/tests/secretLeakPrevention.test.ts` | not run |
| test:dirty-repo-evidence | `tsx packages/validation/src/tests/dirtyRepoEvidence.test.ts` | not run |
| test:dirty-repo-completion-v2 | `tsx packages/validation/src/tests/dirtyRepoCompletionContractV2.test.ts` | not run |
| test:deploy-route-gates | `tsx packages/validation/src/tests/deployRouteGates.test.ts` | not run |
| test:dirty-repo-repair-loop-proof | `tsx packages/validation/src/tests/dirtyRepoRepairLoopProof.test.ts` | not run |
| test:final-release-evidence-lock | `tsx packages/validation/src/tests/finalReleaseEvidenceLock.test.ts` | not run |
| test:master-truth-spec-readiness | `tsx packages/validation/src/tests/masterTruthSpecReadiness.test.ts` | not run |
| test:ui-document-model | `tsx packages/ui-preview-engine/src/tests/uiDocumentModel.test.ts` | not run |
| test:ui-edit-command | `tsx packages/ui-preview-engine/src/tests/uiEditCommand.test.ts` | not run |
| test:ui-selection-state | `tsx packages/ui-preview-engine/src/tests/uiSelectionState.test.ts` | not run |
| test:ui-target-resolver | `tsx packages/ui-preview-engine/src/tests/uiTargetResolver.test.ts` | not run |
| test:live-preview-patch | `tsx packages/ui-preview-engine/src/tests/livePreviewPatch.test.ts` | not run |
| test:ui-mutation-engine | `tsx packages/ui-preview-engine/src/tests/uiMutationEngine.test.ts` | not run |
| test:ui-edit-history | `tsx packages/ui-preview-engine/src/tests/uiEditHistory.test.ts` | not run |
| test:ui-document-diff | `tsx packages/ui-preview-engine/src/tests/uiDocumentDiff.test.ts` | not run |
| test:ui-edit-guardrails | `tsx packages/ui-preview-engine/src/tests/uiEditGuardrails.test.ts` | not run |
| test:ui-source-sync-plan | `tsx packages/ui-preview-engine/src/tests/uiSourceSyncPlan.test.ts` | not run |
| test:ui-edit-workflow | `tsx packages/ui-preview-engine/src/tests/uiEditWorkflow.test.ts` | not run |
| test:ui-preview-interaction-state | `tsx packages/ui-preview-engine/src/tests/uiPreviewInteractionState.test.ts` | not run |
| test:ui-preview-interaction-adapter | `tsx packages/ui-preview-engine/src/tests/uiPreviewInteractionAdapter.test.ts` | not run |
| test:ui-preview-review-payload | `tsx packages/ui-preview-engine/src/tests/uiPreviewReviewPayload.test.ts` | not run |
| test:ui-preview-interaction-fixture | `tsx packages/ui-preview-engine/src/tests/uiPreviewInteractionFixture.test.ts` | not run |
| test:live-ui-builder-vibe-panel | `tsx packages/validation/src/tests/liveUIBuilderVibePanel.test.ts` | not run |
| test:live-ui-builder-vibe-hook | `tsx packages/validation/src/tests/liveUIBuilderVibeHook.test.ts` | not run |
| test:live-ui-builder-vibe-preview-surface | `tsx packages/validation/src/tests/liveUIBuilderVibePreviewSurface.test.ts` | not run |
| test:live-ui-builder-document-renderer | `tsx packages/validation/src/tests/liveUIBuilderDocumentRenderer.test.ts` | not run |
| test:live-ui-builder-inspect-overlay | `tsx packages/validation/src/tests/liveUIBuilderInspectOverlay.test.ts` | not run |
| test:live-ui-builder-command-input | `tsx packages/validation/src/tests/liveUIBuilderCommandInput.test.ts` | not run |
| test:live-ui-builder-resolution-panel | `tsx packages/validation/src/tests/liveUIBuilderResolutionPanel.test.ts` | not run |
| test:live-ui-builder-diff-preview | `tsx packages/validation/src/tests/liveUIBuilderDiffPreview.test.ts` | not run |
| test:ui-source-file-mapping | `tsx packages/ui-preview-engine/src/tests/uiSourceFileMapping.test.ts` | not run |
| test:ui-source-patch | `tsx packages/ui-preview-engine/src/tests/uiSourcePatch.test.ts` | not run |
| test:ui-react-source-analyzer | `tsx packages/ui-preview-engine/src/tests/uiReactSourceAnalyzer.test.ts` | not run |
| test:ui-react-source-patch | `tsx packages/ui-preview-engine/src/tests/uiReactSourcePatch.test.ts` | not run |
| test:ui-route-template | `tsx packages/ui-preview-engine/src/tests/uiRouteTemplate.test.ts` | not run |
| test:ui-source-apply | `tsx packages/ui-preview-engine/src/tests/uiSourceApply.test.ts` | not run |
| test:ui-source-apply-transaction | `tsx packages/ui-preview-engine/src/tests/uiSourceApplyTransaction.test.ts` | not run |
| test:ui-source-apply-proof | `tsx packages/ui-preview-engine/src/tests/uiSourceApplyProof.test.ts` | not run |
| test:ui-source-round-trip | `tsx packages/ui-preview-engine/src/tests/uiSourceRoundTrip.test.ts` | not run |
| test:ui-multi-file-edit-plan | `tsx packages/ui-preview-engine/src/tests/uiMultiFileEditPlan.test.ts` | not run |
| test:ui-cross-component-edit-planner | `tsx packages/ui-preview-engine/src/tests/uiCrossComponentEditPlanner.test.ts` | not run |
| test:live-ui-builder-source-sync-panel | `tsx packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts` | not run |
| test:ui-app-structure-model | `tsx packages/ui-preview-engine/src/tests/uiAppStructureModel.test.ts` | not run |
| test:ui-app-structure-command | `tsx packages/ui-preview-engine/src/tests/uiAppStructureCommand.test.ts` | not run |
| test:ui-app-structure-mutation | `tsx packages/ui-preview-engine/src/tests/uiAppStructureMutation.test.ts` | not run |
| test:live-ui-builder-app-structure-panel | `tsx packages/validation/src/tests/liveUIBuilderAppStructurePanel.test.ts` | not run |
| test:ui-local-file-adapter | `tsx packages/ui-preview-engine/src/tests/uiLocalFileAdapter.test.ts` | not run |
| test:ui-direct-manipulation-model | `tsx packages/ui-preview-engine/src/tests/uiDirectManipulationModel.test.ts` | not run |
| test:ui-direct-manipulation-mutation | `tsx packages/ui-preview-engine/src/tests/uiDirectManipulationMutation.test.ts` | not run |
| test:live-ui-builder-direct-manipulation-overlay | `tsx packages/validation/src/tests/liveUIBuilderDirectManipulationOverlay.test.ts` | not run |
| test:ui-source-identity-model | `tsx packages/ui-preview-engine/src/tests/uiSourceIdentityModel.test.ts` | not run |
| test:ui-source-identity-tracker | `tsx packages/ui-preview-engine/src/tests/uiSourceIdentityTracker.test.ts` | not run |
| test:ui-project-path-normalizer | `tsx packages/ui-preview-engine/src/tests/uiProjectPathNormalizer.test.ts` | not run |
| test:ui-full-project-generation-plan | `tsx packages/ui-preview-engine/src/tests/uiFullProjectGenerationPlan.test.ts` | not run |
| test:ui-full-project-generator | `tsx packages/ui-preview-engine/src/tests/uiFullProjectGenerator.test.ts` | not run |
| test:ui-design-token-model | `tsx packages/ui-preview-engine/src/tests/uiDesignTokenModel.test.ts` | not run |
| test:ui-design-token-normalizer | `tsx packages/ui-preview-engine/src/tests/uiDesignTokenNormalizer.test.ts` | not run |
| test:ui-style-control-plan | `tsx packages/ui-preview-engine/src/tests/uiStyleControlPlan.test.ts` | not run |
| test:ui-style-control-planner | `tsx packages/ui-preview-engine/src/tests/uiStyleControlPlanner.test.ts` | not run |
| test:ui-data-state-api-wiring-model | `tsx packages/ui-preview-engine/src/tests/uiDataStateApiWiringModel.test.ts` | not run |
| test:ui-data-state-api-wiring-normalizer | `tsx packages/ui-preview-engine/src/tests/uiDataStateApiWiringNormalizer.test.ts` | not run |
| test:ui-data-state-api-wiring-planner | `tsx packages/ui-preview-engine/src/tests/uiDataStateApiWiringPlanner.test.ts` | not run |
| test:ui-reliability-repair-model | `tsx packages/ui-preview-engine/src/tests/uiReliabilityRepairModel.test.ts` | not run |
| test:ui-reliability-failure-classifier | `tsx packages/ui-preview-engine/src/tests/uiReliabilityFailureClassifier.test.ts` | not run |
| test:ui-reliability-repair-planner | `tsx packages/ui-preview-engine/src/tests/uiReliabilityRepairPlanner.test.ts` | not run |
| test:ui-builder-ux-control-model | `tsx packages/ui-preview-engine/src/tests/uiBuilderUXControlModel.test.ts` | not run |
| test:ui-builder-ux-control-planner | `tsx packages/ui-preview-engine/src/tests/uiBuilderUXControlPlanner.test.ts` | not run |
| test:ui-export-deploy-model | `tsx packages/ui-preview-engine/src/tests/uiExportDeployModel.test.ts` | not run |
| test:ui-export-bundle-planner | `tsx packages/ui-preview-engine/src/tests/uiExportBundlePlanner.test.ts` | not run |
| test:ui-deploy-target-planner | `tsx packages/ui-preview-engine/src/tests/uiDeployTargetPlanner.test.ts` | not run |
| test:ui-export-deploy-planner | `tsx packages/ui-preview-engine/src/tests/uiExportDeployPlanner.test.ts` | not run |
| test:ui-platform-builder-model | `tsx packages/ui-preview-engine/src/tests/uiPlatformBuilderModel.test.ts` | not run |
| test:ui-platform-target-normalizer | `tsx packages/ui-preview-engine/src/tests/uiPlatformTargetNormalizer.test.ts` | not run |
| test:ui-platform-capability-planner | `tsx packages/ui-preview-engine/src/tests/uiPlatformCapabilityPlanner.test.ts` | not run |
| test:ui-platform-builder-planner | `tsx packages/ui-preview-engine/src/tests/uiPlatformBuilderPlanner.test.ts` | not run |
| test:ui-live-builder-orchestration-graph-verifier | `tsx packages/ui-preview-engine/src/tests/uiLiveBuilderOrchestrationGraphVerifier.test.ts` | not run |
| test:ui-live-builder-orchestration-planner | `tsx packages/ui-preview-engine/src/tests/uiLiveBuilderOrchestrationPlanner.test.ts` | not run |
| test:ui-live-builder-orchestration-model | `tsx packages/ui-preview-engine/src/tests/uiLiveBuilderOrchestrationModel.test.ts` | not run |
| dev | `tsx scripts/startLocal.ts` | not run |
| start:local | `tsx scripts/startLocal.ts` | not run |
| dev:lan | `tsx scripts/startLan.ts` | not run |
| start:phone | `tsx scripts/startLan.ts` | not run |
| test:local-cross-platform-launch-readiness | `tsx packages/validation/src/tests/localCrossPlatformLaunchReadiness.test.ts` | not run |
| test:ui-generated-app-runtime-smoke-model | `tsx packages/ui-preview-engine/src/tests/uiGeneratedAppRuntimeSmokeModel.test.ts` | not run |
| test:ui-generated-app-runtime-smoke-planner | `tsx packages/ui-preview-engine/src/tests/uiGeneratedAppRuntimeSmokePlanner.test.ts` | not run |
| test:generated-app-runtime-smoke-runner | `tsx packages/validation/src/tests/generatedAppRuntimeSmokeRunner.test.ts` | not run |
| test | `npm run -s test:wave-025 && npm run -s test:wave-026` | fail |
| test:wave-025 | `tsx packages/validation/src/tests/proDashboardTruthState.test.ts` | not run |
| test:wave-026 | `tsx packages/validation/src/tests/wave026LiveOrchestrationLoop.test.ts` | not run |
| test:wave-038 | `tsx packages/validation/src/tests/wave038LaunchProofDeployGating.test.ts` | not run |
| test:builder-forensic:smoke | `node scripts/builder-forensic/run.mjs --mode smoke` | not run |
| test:builder-forensic:100 | `node scripts/builder-forensic/run.mjs --mode 100` | not run |
| test:builder-forensic:200 | `node scripts/builder-forensic/run.mjs --mode 200` | not run |
| test:builder-forensic:repair | `node scripts/builder-forensic/run.mjs --mode repair` | not run |
| test:builder-forensic:extreme | `node scripts/builder-forensic/run.mjs --mode extreme` | not run |
| test:builder-forensic:report | `node scripts/builder-forensic/report.mjs` | not run |
| test:builder-forensic:repair-harness | `node scripts/builder-forensic/repair-harness.mjs` | not run |
| audit:routes-commercial | `node scripts/forensic/routes-commercial.mjs` | not run |
| audit:ui-actions | `node scripts/forensic/ui-actions-audit.mjs` | not run |
| test:e2e:live-beta | `node scripts/forensic/e2e-live-beta.mjs --iterations 1` | not run |
| test:e2e:live-beta:100 | `node scripts/forensic/e2e-live-beta.mjs --iterations 100` | not run |
| test:commercial-cockpit | `npx playwright test -c playwright.commercial-visual.config.ts tests/e2e/visual/commercial-cockpit-visual.spec.ts` | not run |
| test:visual-commercial | `node tests/visual/scripts/compare-commercial-cockpit.cjs` | not run |

Release-needed scripts include `build`, `test`, `validate:all`, security/claim-boundary tests, route integrity tests, UI readiness tests, generated app no-placeholder/commercial-readiness tests, and proof/evidence gates. Missing release hygiene: root `lint` and `typecheck`.

## 12. Docs/evidence/artifacts map
- Live/useful docs: root policy/spec/readiness docs, `docs/gate*`, `docs/rc`, `docs/universal-builder`, deployment/local launch docs.
- Outdated/high-review docs: docs and receipts with “final”, “100%”, “commercial ready”, “production ready”, or “enterprise ready” claims should be checked against current failed validators.
- Evidence artifacts: `release-evidence/**` is active proof material; `receipts/**` is historical evidence and should be archived/cleaned later, not deleted now.
- Generated screenshots: reference UI PNGs and visual test references should remain until visual gates are replaced.

## 13. Delete candidates
- **deprecated** `fixtures/generated-app-corpus/representative/api-service/src/main.ts` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-01-syntax-error/app.js` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-01-syntax-error/fixture.json` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-02-missing-dependency/app.js` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-02-missing-dependency/fixture.json` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-03-bad-health-route/app.js` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-03-bad-health-route/fixture.json` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-04-wrong-run-command/app.js` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-04-wrong-run-command/fixture.json` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-05-missing-route/app.js` — verify
- **deprecated** `fixtures/repair-fixtures/fixture-05-missing-route/fixture.json` — verify
- **deprecated** `packages/github-adapter/src/mockGithub.ts` — verify (wording/demo hit)
- **deprecated** `packages/vercel-adapter/src/mockVercel.ts` — verify
- **deprecated** `receipts/beta-simulation/baseline/build.exit` — verify
- **deprecated** `receipts/beta-simulation/baseline/matching-scripts.txt` — verify
- **deprecated** `receipts/beta-simulation/baseline/npm-ci.exit` — verify
- **deprecated** `receipts/beta-simulation/baseline/script-test_e2e_beta-owner-launch.exit` — verify
- **deprecated** `receipts/beta-simulation/baseline/script-test_ui-generated-app-runtime-smoke-model.exit` — verify
- **deprecated** `receipts/beta-simulation/baseline/script-test_ui-generated-app-runtime-smoke-planner.exit` — verify
- **deprecated** `receipts/beta-simulation/baseline/test.exit` — verify
- **deprecated** `receipts/beta-simulation/beta-simulation-report.json` — verify
- **deprecated** `receipts/beta-simulation/beta-simulation-report.md` — verify
- **deprecated** `receipts/beta-simulation/beta-simulation-requests.json` — verify
- **deprecated** `receipts/beta-simulation/final-owner-verdict.md` — verify (wording/demo hit)
- **deprecated** `receipts/builder-forensic/capability-matrix.csv` — verify (wording/demo hit)
- **deprecated** `receipts/builder-forensic/claim-boundary.md` — verify
- **deprecated** `receipts/builder-forensic/latest-run.json` — verify
- **deprecated** `receipts/builder-forensic/runtime-window.json` — verify
- **deprecated** `receipts/builder-forensic/summary.json` — verify (wording/demo hit)
- **deprecated** `receipts/builder-forensic/summary.md` — verify (wording/demo hit)
- **deprecated** `receipts/builder-forensic/top-blockers.md` — verify
- **deprecated** `receipts/final-qa/qa-summary.json` — verify (wording/demo hit)
- **deprecated** `receipts/final-qa/qa-summary.md` — verify (wording/demo hit)
- **deprecated** `receipts/final-remediation-commit-20260501/beta-simulation-report.json` — verify
- **deprecated** `receipts/final-remediation-commit-20260501/beta-simulation-report.md` — verify (wording/demo hit)
- **deprecated** `receipts/final-remediation-commit-20260501/final-commit-receipt.md` — verify (wording/demo hit)
- **deprecated** `receipts/final-remediation-commit-20260501/final-remediation-verdict.md` — verify (wording/demo hit)
- **deprecated** `receipts/final-remediation-commit-20260501/initial-diff-files.txt` — verify
- **deprecated** `receipts/final-remediation-commit-20260501/initial-diff-stat.txt` — verify
- **deprecated** `receipts/final-remediation-commit-20260501/initial-git-status.txt` — verify (wording/demo hit)
- **deprecated** `receipts/final-remediation-commit-20260501/secret-scan.txt` — verify (wording/demo hit)
- **deprecated** `receipts/final-verdict.md` — verify (wording/demo hit)
- **deprecated** `receipts/forensic-readiness/e2e-live-beta-loop-0001.json` — verify
- **deprecated** `receipts/forensic-readiness/e2e-live-beta-summary-1.json` — verify
- **deprecated** `receipts/forensic-readiness/e2e-live-beta-summary-1.md` — verify
- **deprecated** `receipts/forensic-readiness/e2e-live-beta-summary-100.json` — verify
- **deprecated** `receipts/forensic-readiness/e2e-live-beta-summary-100.md` — verify
- **deprecated** `receipts/forensic-readiness/routes-commercial.json` — verify
- **deprecated** `receipts/forensic-readiness/routes-commercial.md` — verify
- **deprecated** `receipts/forensic-readiness/ui-actions.json` — verify
- **deprecated** `receipts/forensic-readiness/ui-actions.md` — verify
- **deprecated** `receipts/lean-clean-green-20260501/final-lean-clean-green-receipt.md` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-beta-simulation.exit` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-beta-simulation.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-build.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-e2e-beta-owner-launch.exit` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-e2e-beta-owner-launch.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-lint.exit` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-lint.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-npm-ci.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-smoke.exit` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-smoke.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-test.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-typecheck.exit` — verify
- **deprecated** `receipts/lean-clean-green-20260501/fresh-main-typecheck.log` — verify
- **deprecated** `receipts/lean-clean-green-20260501/generated-build-folders-removed.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/initial-branch.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/initial-diff-files.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/initial-diff-stat.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/initial-head.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/initial-status.txt` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/npm-run-root.txt` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/package-json-files.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/pwd.txt` — verify
- **deprecated** `receipts/lean-clean-green-20260501/root-package-scripts.json` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/secret-scan-resolution.md` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/secret-scan.txt` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/status-after-local-junk-clean.txt` — verify (wording/demo hit)
- **deprecated** `receipts/lean-clean-green-20260501/status-after-stash-recovery.txt` — verify
- **deprecated** `receipts/main-cleanup/build.exit` — verify
- **deprecated** `receipts/main-cleanup/final-clean-main-receipt.md` — verify (wording/demo hit)
- **deprecated** `receipts/main-cleanup/junk-classification.md` — verify
- **deprecated** `receipts/main-cleanup/npm-ci.exit` — verify
- **deprecated** `receipts/main-cleanup/secret-scan-summary.md` — verify (wording/demo hit)
- **deprecated** `receipts/main-cleanup/secret-scan.md` — verify
- **deprecated** `receipts/main-cleanup/step8-git-diff.patch` — verify (wording/demo hit)
- **deprecated** `receipts/main-cleanup/test.exit` — verify
- **deprecated** `receipts/pr-triage/final-pr-triage-receipt.md` — verify (wording/demo hit)
- **deprecated** `receipts/pr-triage/open-prs-after-packet-close.json` — verify
- **deprecated** `receipts/pr-triage/open-prs-after-packet-close.txt` — verify
- **deprecated** `receipts/pr-triage/open-prs-before-packet-close.json` — verify
- **deprecated** `receipts/pr-triage/open-prs-before.json` — verify
- **deprecated** `receipts/pr-triage/open-prs-resume.json` — verify
- **deprecated** `receipts/pr-triage/open-prs.json` — verify
- **deprecated** `receipts/pr-triage/packet-close-output.log` — verify
- **deprecated** `receipts/pr-triage/packet-close-plan.md` — verify
- **deprecated** `receipts/pr-triage/packet-prs-to-close.json` — verify
- **deprecated** `receipts/pr-triage/prs-to-keep-or-review.json` — verify
- **deprecated** `receipts/repair-self-healing/repair-cases.csv` — verify
- **deprecated** `receipts/repair-self-healing/repair-flow-inventory.md` — verify (wording/demo hit)

No deletion is performed in this audit.

## 14. Improve candidates
- **improve** `BLUEPRINT_REGISTRY.md` — improve (wording/demo hit)
- **improve** `BOTOMATIC_BUILD_DISCIPLINE.md` — improve (wording/demo hit)
- **improve** `BOTOMATIC_FINAL_CLOSURE_PROGRAM.md` — improve (wording/demo hit)
- **improve** `DOMAIN_BUILDER_REGISTRY.md` — improve (wording/demo hit)
- **improve** `ENTERPRISE_AUTH_AND_GATE_PLAN.md` — improve (wording/demo hit)
- **improve** `ENTERPRISE_LAUNCH_RUBRIC.md` — improve (wording/demo hit)
- **improve** `EVIDENCE_BOUNDARY_POLICY.md` — improve (wording/demo hit)
- **improve** `FINAL_ENTERPRISE_SELLABILITY_AUDIT.md` — improve (wording/demo hit)
- **improve** `FINAL_LAUNCH_READINESS_CRITERIA.md` — improve (wording/demo hit)
- **improve** `FINAL_VISUAL_DESIGN_PHASE.md` — improve (wording/demo hit)
- **improve** `GENERATED_APP_ENTERPRISE_RUBRIC.md` — improve (wording/demo hit)
- **improve** `GENERATED_APP_VALIDATION_MATRIX.md` — improve (wording/demo hit)
- **improve** `ISSUE_STACK.md` — improve (wording/demo hit)
- **improve** `LAUNCH_BLOCKERS.md` — improve (wording/demo hit)
- **improve** `LEGAL_CLAIM_BOUNDARIES.md` — improve (wording/demo hit)
- **improve** `MASTER_TRUTH_SPEC.md` — improve (wording/demo hit)
- **improve** `MAX_POWER_COMPLETION_PROGRAM.md` — improve (wording/demo hit)
- **improve** `NO_PLACEHOLDER_POLICY.md` — improve (wording/demo hit)
- **improve** `PRODUCT_SCOPE.md` — improve (wording/demo hit)
- **improve** `README.md` — improve (wording/demo hit)
- **improve** `UNIVERSAL_BUILDER_TARGET.md` — improve (wording/demo hit)
- **improve** `VALIDATION_MATRIX.md` — improve (wording/demo hit)
- **improve** `apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx` — improve (wording/demo hit)
- **improve** `apps/control-plane/src/components/pro/proSeedData.ts` — improve (wording/demo hit)
- **improve** `docs/final-release-evidence-lock.md` — improve (wording/demo hit)
- **improve** `docs/gate3/GATE3_RUNTIME_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate4/GATE4_RUNTIME_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate5/GATE5_RUNTIME_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate6/GATE6_RUNTIME_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate7/GATE7_FINAL_CLOSURE_AUDIT_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate7/GATE7_VALIDATION_DEPTH_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate7/OBSERVABILITY_HARDENING_RUNTIME_PROOF_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/gate7/PRODUCTION_PROOF_PROFILE_2026-04-23.md` — improve (wording/demo hit)
- **improve** `docs/generated-app-commercial-readiness-gate.md` — improve (wording/demo hit)
- **improve** `docs/generated-app-corpus-harness.md` — improve (wording/demo hit)
- **improve** `docs/generated-app-no-placeholder-validator.md` — improve (wording/demo hit)
- **improve** `docs/generated-app-representative-corpus.md` — improve (wording/demo hit)
- **improve** `docs/live-ui-builder-behavioral-gap-baseline.md` — improve (wording/demo hit)
- **improve** `docs/reference-ui/README.md` — improve (wording/demo hit)
- **improve** `docs/secret-leak-prevention.md` — improve (wording/demo hit)
- **improve** `docs/universal-builder/DOMAIN_LAUNCH_RUBRICS.md` — improve (wording/demo hit)
- **improve** `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/README.md` — improve (wording/demo hit)
- **improve** `packages/ui-preview-engine/README.md` — improve (wording/demo hit)

## 15. Unknown / human-review items
- **unknown** `.env.example` — verify
- **unknown** `.github/pull_request_template.md` — verify
- **unknown** `.github/workflows/botomatic-pr-gates.yml` — verify
- **unknown** `.gitignore` — verify
- **unknown** `Procfile` — verify
- **unknown** `apps/claude-runner/package.json` — verify
- **unknown** `apps/control-plane/.gitignore` — verify
- **unknown** `apps/control-plane/.vercel-deploy` — verify
- **unknown** `apps/control-plane/next-env.d.ts` — verify
- **unknown** `apps/control-plane/package.json` — verify
- **unknown** `apps/control-plane/src/components/chat/QuickActionRow.tsx` — verify
- **unknown** `apps/control-plane/src/components/ops/OpsPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/AssumptionLedgerPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/OpenQuestionsPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/OverviewPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/RecommendationPanel.tsx` — verify
- **unknown** `apps/control-plane/src/components/overview/RepoRescuePanel.tsx` — verify (wording/demo hit)
- **unknown** `apps/control-plane/src/components/overview/SelfUpgradePanel.tsx` — verify (wording/demo hit)
- **unknown** `apps/control-plane/src/components/shell/workspaceView.ts` — verify
- **unknown** `apps/control-plane/src/services/panelTruth.ts` — verify
- **unknown** `apps/control-plane/src/styles/app.css` — verify (wording/demo hit)
- **unknown** `apps/control-plane/tsconfig.json` — verify
- **unknown** `apps/control-plane/tsconfig.tsbuildinfo` — verify
- **unknown** `apps/control-plane/vercel.json` — verify
- **unknown** `apps/orchestrator-api/package.json` — verify
- **unknown** `apps/orchestrator-api/src/deployment/history.ts` — verify
- **unknown** `apps/orchestrator-api/src/deployment/types.ts` — verify
- **unknown** `apps/orchestrator-api/src/gates/gateTypes.ts` — verify
- **unknown** `apps/orchestrator-api/src/observability/types.ts` — verify
- **unknown** `desktop/LAUNCH_BOTOMATIC.txt` — verify
- **unknown** `fixtures/generated-app-corpus/representative/api-service/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/booking-app/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/booking-app/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/bot-agent-console/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/bot-agent-console/src/main.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/customer-portal/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/customer-portal/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/ecommerce-store/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/ecommerce-store/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/game-landing-page/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/game-landing-page/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/marketplace/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/marketplace/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/mobile-app-shell/package.json` — verify
- **unknown** `fixtures/generated-app-corpus/representative/mobile-app-shell/src/main.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/app/page.tsx` — verify (wording/demo hit)
- **unknown** `fixtures/generated-app-corpus/representative/negative/placeholder-blocked-controlled/package.json` — verify (wording/demo hit)
- **unknown** `fixtures/generated-app-corpus/representative/web-saas-dashboard/app/page.tsx` — verify
- **unknown** `fixtures/generated-app-corpus/representative/web-saas-dashboard/package.json` — verify
- **unknown** `fixtures/repair-fixtures/fixture-01-syntax-error/package.json` — verify
- **unknown** `fixtures/repair-fixtures/fixture-02-missing-dependency/package.json` — verify
- **unknown** `fixtures/repair-fixtures/fixture-03-bad-health-route/package.json` — verify
- **unknown** `fixtures/repair-fixtures/fixture-04-wrong-run-command/package.json` — verify
- **unknown** `fixtures/repair-fixtures/fixture-05-missing-route/package.json` — verify
- **unknown** `nixpacks.toml` — verify
- **unknown** `package.json` — verify (wording/demo hit)
- **unknown** `packages/blueprints/src/index.ts` — verify
- **unknown** `packages/capability-system/src/index.ts` — verify
- **unknown** `packages/domain-builders/src/index.ts` — verify
- **unknown** `packages/github-adapter/src/liveGithub.ts` — verify
- **unknown** `packages/proof-gate/src/readiness.ts` — verify
- **unknown** `packages/repair-loop/src/index.ts` — verify
- **unknown** `packages/sandbox/src/index.ts` — verify
- **unknown** `packages/trigger-adapter/src/liveTrigger.ts` — verify
- **unknown** `packages/trigger-adapter/src/retryPolicy.ts` — verify
- **unknown** `packages/validation/src/repoValidators/liveUIBuilderScalabilityPerformanceReadiness.ts` — verify
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/next-app-basic/package.json` — verify
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/vite-react-basic/package-lock.json` — verify
- **unknown** `packages/validation/src/runtime/fixtures/generated-apps/vite-react-basic/package.json` — verify
- **unknown** `packages/validation/src/visual/proDashboard.spec.ts` — verify
- **unknown** `packages/validation/src/visual/vibeDashboard.spec.ts` — verify
- **unknown** `playwright.config.ts` — verify
- **unknown** `railway.json` — verify
- **unknown** `receipts/beta-simulation/baseline/script-proof_claim-99-independent-audit.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-test_generated-app-runtime-smoke-runner.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_all.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_behavioral.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_changed.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_fast.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/script-validate_observability.exit` — verify
- **unknown** `receipts/beta-simulation/baseline/validate-all.exit` — verify
- **unknown** `receipts/lean-clean-green-20260501/fresh-main-validate-all.log` — verify
- **unknown** `receipts/lean-clean-green-20260501/origin-main-proof-head.txt` — verify
- **unknown** `receipts/lean-clean-green-20260501/proof-branch-status-before.txt` — verify (wording/demo hit)
- **unknown** `receipts/lean-clean-green-20260501/root-validate-all-check.json` — verify
- **unknown** `receipts/lean-clean-green-20260501/validate-all-locations.txt` — verify
- **unknown** `receipts/lean-clean-green-20260501/validate-script-fix.diff` — verify
- **unknown** `receipts/main-cleanup/validate-all-rerun.exit` — verify
- **unknown** `receipts/main-cleanup/validate-all.exit` — verify
- **unknown** `release-evidence/generated-apps/api_service/src/server.ts` — verify
- **unknown** `release-evidence/generated-apps/bot/deploy/worker.md` — verify
- **unknown** `release-evidence/generated-apps/bot/dist/worker.js` — verify
- **unknown** `release-evidence/generated-apps/bot/src/worker.ts` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/layout.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/app/pricing/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/marketing_website/components/HeroSection.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/App.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/screens/HomeScreen.tsx` — verify
- **unknown** `release-evidence/generated-apps/mobile_app/src/services/api.ts` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246024456/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246116324/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777246396829/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777248493513/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777255715931/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777256631918/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362157622/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362595155/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/app/settings/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/proj_1777362757988/components/AppShell.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/app/dashboard/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/app/layout.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/app/page.tsx` — verify
- **unknown** `release-evidence/generated-apps/web_saas_app/components/AppShell.tsx` — verify
- **unknown** `scripts/forensic/api-live-beta.mjs` — verify
- **unknown** `scripts/forensic/forensic-private-beta-audit.mjs` — verify
- **unknown** `scripts/forensic/run-gate11.sh` — verify
- **unknown** `src/trigger/botomatic.ts` — verify
- **unknown** `src/trigger/example.ts` — verify
- **unknown** `supabase/migrations/001_init.sql` — verify
- **unknown** `trigger.config.ts` — verify

## 16. Recommended cleanup batches
- Batch 1: safest cleanup — archive/label obsolete receipts and generated runtime artifacts after confirming they are not release gates.
- Batch 2: stale validator cleanup — update ProDashboard, /vibe, live UI builder missing-file validators to current canonical paths.
- Batch 3: route/shell consolidation — document AppShell + VibeDashboard as canonical and remove stale shell/cockpit validator assumptions.
- Batch 4: orchestration hardening — separate PR for durable/memory fallback policy, queue parity, auth fail-closed deployment proof, and executor observability.
- Batch 5: wording/commercial-claim cleanup — align docs/README/evidence with current failing validators and claim-boundary policy.
- Batch 6: docs/evidence cleanup — consolidate final evidence docs and mark historical receipts as archived.

## 17. Final recommended canonical live map
- Exact routes that should remain: `/`, `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/deployment`, `/projects/[projectId]/logs`, `/projects/[projectId]/evidence`, `/projects/[projectId]/validators`, `/projects/[projectId]/vault`, `/projects/[projectId]/settings`, and `/projects/[projectId]/onboarding` if first-run remains in scope.
- Exact major components/shells that should remain: `AppShell`, `VibeDashboard`, current overview panels, UI primitives, live UI builder document/inspect/direct-manipulation pieces, and service wrappers used by VibeDashboard.
- Exact backend orchestration path that should remain: `bootstrap.ts` -> `server_app.ts buildApp` -> intake/source routes -> `compileProjectWithIntake` -> `generatePlan` -> `enqueueJob`/worker -> executor -> repository persistence -> validation/evidence UI APIs.
- Exact validators that should gate release: architecture, builder capability, UI readiness/control-plane integration after stale path updates, security/auth governance, reliability, observability, launch readiness, deployment rollback, claim boundary, generated app no-placeholder/commercial readiness, route integrity aligned to current routes, and live UI builder validators aligned to canonical files.

## JSON summary counts
- total items audited: 1576
- live: 1219
- should_be_live: 0
- improve: 43
- deprecated: 114
- delete_candidate: 0
- stale_validator_reference: 53
- unknown: 147
