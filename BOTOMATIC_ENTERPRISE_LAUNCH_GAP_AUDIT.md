# Botomatic Enterprise Launch Gap Audit

Generated: 2026-05-05 UTC. This audit is read-only and creates only `BOTOMATIC_ENTERPRISE_LAUNCH_GAP_AUDIT.md` and `botomatic-enterprise-launch-gap-matrix.json`.

## 1. Executive summary

- **Current enterprise readiness score:** **35/100**.
- **Current launch recommendation:** **no-go** for public launch, paid beta, and enterprise sale. Trusted internal demos may continue only if clearly labeled non-production and isolated from customer data.
- **Total gaps found:** 50
- **P0/P1/P2/P3:** 12/19/13/6
- **Public-launch blockers:** 41
- **Private-beta blockers:** 30
- **Enterprise-sale blockers:** 45

### Top 20 blockers
- **GAP-001 (P0) Root test command fails on deleted ProDashboard path** — Current root tests cannot be used as launch gate because they fail before exercising current VibeDashboard/AppShell path. Proof needed: Updated root test suite passes against canonical AppShell/VibeDashboard routes and fails on regressions.
- **GAP-002 (P0) Full validation is red with 18 failing validators** — Validation registry is not green and includes stale or incomplete UI/live-builder checks. Proof needed: `npm run validate:all` passes after stale validators are corrected and missing proofs added.
- **GAP-003 (P0) No proven tenant/project ownership isolation** — Project access appears keyed primarily by project ID, with no current proof that one authenticated user cannot access another project. Proof needed: Negative-path tenant isolation test covering UI/API/job/evidence access across two users and durable database RLS/policies.
- **GAP-004 (P0) Development auth-disabled/anonymous path exists and must be impossible in production** — There is a safe commercial guard, but deployment proof must show production cannot run with RUNTIME_MODE unset/development or with auth disabled while publicly reachable. Proof needed: Production boot test and deployment smoke proving public env refuses missing auth and cannot start with disabled auth.
- **GAP-005 (P0) Many project routes lack visible requireRole wrapper** — Route-level auth is inconsistent: high-sensitivity flows rely on getVerifiedAuth/getRequestActor internally or no wrapper instead of uniform route middleware. Proof needed: Route authorization matrix plus negative-path tests for every route.
- **GAP-006 (P0) No current full secret scan across source, history, evidence, logs, and UI** — Secret-scan proof is incomplete for the full enterprise boundary requested here. Proof needed: `proof:no-secrets` covering source, git history, release evidence, receipts, logs, generated apps, UI responses, and redaction assertions.
- **GAP-007 (P0) No proven real end-to-end orchestration path under durable mode** — Current proof is fragmented and mixed with local/mock evidence; enterprise-grade durable E2E proof is missing. Proof needed: `proof:orchestration-core` that runs the full durable path, restarts services, and verifies final app/materialization/evidence.
- **GAP-008 (P0) Durable/Supabase outage can silently downgrade to memory/development mode** — Fallback protects local dev but is unsafe if reachable production ever downgrades to ephemeral memory. Proof needed: Production-mode startup test proving Supabase outage aborts or fails readiness rather than accepting traffic.
- **GAP-009 (P0) Dashboard route validator expects deleted/replaced `/vibe` path** — A stale validator makes route integrity signal unreliable. Proof needed: Updated validator verifies `/projects/[projectId]` renders VibeDashboard/AppShell and old route decisions are explicit.
- **GAP-010 (P0) Core legal/commercial documents are missing** — Repo contains claim-boundary docs but not customer-ready legal/commercial docs. Proof needed: Legal document checklist reviewed by counsel and linked in product/docs.
- **GAP-011 (P0) Billing, plan, usage, and entitlement enforcement are absent or unproven** — If Botomatic is paid SaaS, monetization controls are not proven in live product. Proof needed: Billing/entitlement integration tests plus product routes and server-side enforcement proof.
- **GAP-046 (P0) Missing proof:tenant-isolation** — Tenant isolation is unknown. Proof needed: Add and run proof:tenant-isolation as machine-readable JSON plus human-readable evidence.
- **GAP-012 (P1) Duplicate enqueue protection is incomplete/unknown** — Same packet may be enqueued multiple times unless a deeper constraint exists outside observed schema. Proof needed: Concurrent enqueue/idempotency test and DB uniqueness constraint proof.
- **GAP-013 (P1) Dead-letter/retry/stuck-job lifecycle is not enterprise-proven** — Current queue can reclaim expired jobs but lacks proven retry budgets/dead-letter operational path. Proof needed: Queue failure-mode test suite: worker crash, executor failure, stuck lease, retry exhaustion, dead-letter, alert.
- **GAP-014 (P1) Restart/resume behavior not proven across API, worker, runner, and UI** — Restart/resume is implemented in pieces but lacks launch-grade proof. Proof needed: Durable restart proof that kills/restarts services mid-build and verifies no duplicate/lost work.
- **GAP-015 (P1) Vibe Builder commercial usefulness is not proven** — Core UI exists but multiple commercial live-builder capabilities are incomplete or failing validation. Proof needed: End-to-end Vibe Builder proof editing a real project, syncing source, previewing, validating, exporting/deploying.
- **GAP-016 (P1) Live UI fake/demo/seed leakage not fully proven absent** — Hardcoded UI affordances may be fine, but live-data boundary is unproven. Proof needed: No-demo-live-ui validator scanning rendered pages/API responses and verifying demo mode gates.
- **GAP-017 (P1) Accessibility/responsiveness proof missing** — No current accessibility/responsive proof for canonical AppShell/VibeDashboard routes. Proof needed: Playwright/aXe/responsive screenshot proof for all customer-facing routes.
- **GAP-018 (P1) No rate limiting or abuse protection proof** — High-cost AI/build routes may be callable repeatedly without proven throttling. Proof needed: Rate-limit tests for auth failures, operator/send, intake/upload, and executor dispatch.
- **GAP-019 (P1) CSRF/browser-origin protection is not proven** — CSRF applicability is unknown because auth/session model is not fully documented/proven. Proof needed: Security proof documenting auth transport and CSRF negative tests where applicable.

### Top 20 fastest wins
- **GAP-001 Root test command fails on deleted ProDashboard path** — Update stale test expectations in a later validator PR and require `npm run test` in CI.
- **GAP-002 Full validation is red with 18 failing validators** — Separate validator remediation PR: update stale paths, remove permissive checks, add missing proof validators.
- **GAP-009 Dashboard route validator expects deleted/replaced `/vibe` path** — Update validator later; do not re-add old route just to satisfy stale gate.
- **GAP-010 Core legal/commercial documents are missing** — Add legal/commercial documents in a separate non-code PR after counsel review.
- **GAP-011 Billing, plan, usage, and entitlement enforcement are absent or unproven** — Implement or explicitly scope out paid SaaS before launch; add plan enforcement proof.
- **GAP-026 Enterprise admin/operator/support docs missing or incomplete** — Create enterprise docs pack and validate with fresh environment setup.
- **GAP-030 Some validators pass despite current root gates failing** — Make final validators aggregate global gate state fail-closed.
- **GAP-031 No accepted enterprise-launch proof bundle** — Add unified proof bundle after underlying gaps close.
- **GAP-037 Historical receipts/generated artifacts create release-truth noise** — Archive/label in cleanup PR after proof retention decision.
- **GAP-038 Overclaim wording remains in docs/evidence** — Run claim cleanup batch after canonical proof status is established.
- **GAP-039 Root workspace layout does not include all source packages** — Either add workspaces or document intentional non-workspace package model.
- **GAP-042 Duplicate/deprecated legacy API entrypoint remains** — Document or delete later in a cleanup PR after proof.
- **GAP-043 Duplicate CSS/stale style ownership not fully mapped** — Map CSS ownership before any cleanup.
- **GAP-044 Changelog/versioning release notes missing** — Add changelog/release process docs.
- **GAP-045 Missing proof:security-auth** — Create the missing proof after underlying implementation gaps close.
- **GAP-046 Missing proof:tenant-isolation** — Create the missing proof after underlying implementation gaps close.
- **GAP-047 Missing proof:no-demo-live-ui** — Create the missing proof after underlying implementation gaps close.
- **GAP-048 Missing proof:deployment-smoke** — Create the missing proof after underlying implementation gaps close.
- **GAP-049 Missing proof:data-retention** — Create the missing proof after underlying implementation gaps close.
- **GAP-050 Missing proof:enterprise-launch** — Create the missing proof after underlying implementation gaps close.

### Top 20 highest-risk unknowns
- **GAP-006 (P0) No current full secret scan across source, history, evidence, logs, and UI** — `proof:no-secrets` covering source, git history, release evidence, receipts, logs, generated apps, UI responses, and redaction assertions.
- **GAP-007 (P0) No proven real end-to-end orchestration path under durable mode** — `proof:orchestration-core` that runs the full durable path, restarts services, and verifies final app/materialization/evidence.
- **GAP-011 (P0) Billing, plan, usage, and entitlement enforcement are absent or unproven** — Billing/entitlement integration tests plus product routes and server-side enforcement proof.
- **GAP-012 (P1) Duplicate enqueue protection is incomplete/unknown** — Concurrent enqueue/idempotency test and DB uniqueness constraint proof.
- **GAP-014 (P1) Restart/resume behavior not proven across API, worker, runner, and UI** — Durable restart proof that kills/restarts services mid-build and verifies no duplicate/lost work.
- **GAP-016 (P1) Live UI fake/demo/seed leakage not fully proven absent** — No-demo-live-ui validator scanning rendered pages/API responses and verifying demo mode gates.
- **GAP-017 (P1) Accessibility/responsiveness proof missing** — Playwright/aXe/responsive screenshot proof for all customer-facing routes.
- **GAP-018 (P1) No rate limiting or abuse protection proof** — Rate-limit tests for auth failures, operator/send, intake/upload, and executor dispatch.
- **GAP-019 (P1) CSRF/browser-origin protection is not proven** — Security proof documenting auth transport and CSRF negative tests where applicable.
- **GAP-020 (P1) Service-role key boundary and RLS posture unproven** — Secret-boundary test plus Supabase RLS/policy proof.
- **GAP-021 (P1) Data retention/deletion/export lifecycle missing** — `proof:data-retention` covering create/export/delete/retention/evidence/log cleanup.
- **GAP-022 (P1) Backup/restore process is missing** — Backup/restore drill evidence with RPO/RTO and rollback validation.
- **GAP-023 (P1) Staging/production separation is not proven** — Staging/prod smoke evidence with distinct env manifests and blocked cross-env access.
- **GAP-027 (P2) Memory-mode worker parity with durable mode is unproven** — Mode parity test matrix for memory and durable queue/repository.
- **GAP-028 (P2) Executor reliability and sandboxing proof incomplete** — Executor integration proof with timeout, failure, secret redaction, sandbox boundaries, and cost controls.
- **GAP-029 (P2) Commercial/pro cockpit route absent or intentionally replaced but not documented** — Canonical route/product IA decision document and route validator.
- **GAP-031 (P2) No accepted enterprise-launch proof bundle** — `proof:enterprise-launch` generating signed/dated JSON+MD evidence bundle.
- **GAP-034 (P2) AI vendor data handling and disclosure incomplete** — Privacy/DPA/AI disclosure docs plus tests proving prompt/output storage boundaries.
- **GAP-035 (P2) Dependency vulnerability gate not proven current** — Dependency scan artifact with severity threshold and remediation/exception process.
- **GAP-036 (P2) Incident response and support workflow missing** — Incident runbook and support workflow reviewed in tabletop exercise.

## 2. Enterprise target definition

Botomatic can be called enterprise-ready only when it has executable, current, fail-closed proof that: core orchestration works end-to-end in durable mode; intake creates durable projects and valid plans; plans/packets/queues/workers/executors/materialization/preview/validation/evidence are reliable; auth cannot be disabled or bypassed in production; tenant/project isolation is proven; secrets are absent from source/history/logs/evidence/UI; staging and production deployments are reproducible with smoke tests and rollback; observability and incident workflows exist; data retention/deletion/export/backups/restore are defined and proven; UI is polished/responsive/accessibility-tested and free of fake/demo leakage; validators match canonical product paths; legal/commercial docs are present; billing/entitlement enforcement exists if paid; admin/support docs are accurate; overclaim wording is removed or proof-backed; release process includes versioning/changelog/CI/staging smoke/prod smoke/rollback; and enterprise expectations such as RBAC, audit logs, SSO/OIDC, environment separation, access controls, data controls, and support process are met.

## 3. Current repo baseline

### Git/VCS
- Branch: `work`
- Commit SHA: `840f3f963893d75d08f441de7d8c33904b246859`
- Git status at audit start: `## work`

### Package manager and workspace layout
- Package manager detected: npm, with root `package.json` and `package-lock.json`.
- Root workspaces: `["apps/control-plane","apps/orchestrator-api"]`.
- Additional package-bearing source: `apps/claude-runner/package.json`; many `packages/*` directories are invoked by scripts but are not root npm workspaces.

### Recent git log summary
```
840f3f9 Add Botomatic path census audit
9c6ec56 Fix build pipeline: store plan on project + cascade wave progression
d2cf4d2 Fix orchestration pipeline, build execution, Windows launcher
2df0603 chore: remove dead UI code after fresh shell rewrite (-2004 lines)
38dfe6a fix: resolve .app-shell CSS conflict with globals.css
756a6fd feat: fresh UI — new AppShell, VibeDashboard, and app.css
2f96e3b fix: real intake page, nav icon doubling, correct routing + schema alignment
e105c98 chore: trigger Vercel initial deploy (#1822)
82dd167 feat: commercial deployment — Railway + Supabase + Vercel + full bootstrap
2f82949 chore: ignore runtime/ and synthesized_capabilities.json
31319f0 fix: local dev startup clears OIDC + gitignore tsbuildinfo
0b1fe35 merge: commercial capabilities endpoint
194f72f feat: forensic repair system + memory-mode workspace materialization (PASS_REAL 100%)
f7639fc chore: add post-merge finalization report (#1253)
38ff05d Clean repo PR stack and preserve autonomous builder work (#1252)
43c8588 fix: close max-power commercial UI real-data proof gaps (#1224)
b2e572d fix: restore commercial project workspace UI shell (#656)
f388f27 fix: filter known non-fatal Next.js and hydration console noise in owner-launch e2e (#655)
b500578 fix: stabilize hydration style for owner-launch e2e (#654)
6f06309 fix: add CORS middleware to orchestrator app (#626)
```

### Diagnostics run and results
| Command | Exists? | Result |
| --- | --- | --- |
| npm run build | exists | pass |
| npm run test | exists | fail |
| npm run validate:all | exists | fail |
| npm run lint | missing | fail |
| npm run typecheck | missing | fail |

Dependencies were present, so `npm install` was not run.

### Root package scripts
| Script | Command | Observed status in this audit |
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

### Detected current route/API evidence
- Next route files detected:
```
apps/control-plane/src/app/api/[...path]/route.ts
apps/control-plane/src/app/api/hybrid-ci/route.ts
apps/control-plane/src/app/api/local-repo-dashboard/route.ts
apps/control-plane/src/app/api/local-repo-dashboard/stream/route.ts
apps/control-plane/src/app/api/projects/[projectId]/deploy/route.ts
apps/control-plane/src/app/api/projects/[projectId]/deployments/route.ts
apps/control-plane/src/app/api/projects/[projectId]/execution/[runId]/route.ts
apps/control-plane/src/app/api/projects/[projectId]/execution/route.ts
apps/control-plane/src/app/api/projects/[projectId]/jobs/route.ts
apps/control-plane/src/app/api/projects/[projectId]/launch-proof/route.ts
apps/control-plane/src/app/api/projects/[projectId]/launch/verify/route.ts
apps/control-plane/src/app/api/projects/[projectId]/rollback/route.ts
apps/control-plane/src/app/api/projects/[projectId]/runtime/logs/route.ts
apps/control-plane/src/app/api/projects/[projectId]/runtime/route.ts
apps/control-plane/src/app/api/projects/[projectId]/runtime/start/route.ts
apps/control-plane/src/app/api/projects/[projectId]/runtime/stop/route.ts
apps/control-plane/src/app/favicon.ico/route.ts
apps/control-plane/src/app/layout.tsx
apps/control-plane/src/app/page.tsx
apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx
apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx
apps/control-plane/src/app/projects/[projectId]/logs/page.tsx
apps/control-plane/src/app/projects/[projectId]/onboarding/page.tsx
apps/control-plane/src/app/projects/[projectId]/page.tsx
apps/control-plane/src/app/projects/[projectId]/settings/page.tsx
apps/control-plane/src/app/projects/[projectId]/validators/page.tsx
apps/control-plane/src/app/projects/[projectId]/vault/page.tsx
apps/control-plane/src/app/projects/new/page.tsx
apps/control-plane/src/app/projects/page.tsx
```
- Express route registrations detected:
```
apps/orchestrator-api/src/server_app.ts:1710:  app.get("/health", respondHealth);
apps/orchestrator-api/src/server_app.ts:1711:  app.get("/api/health", respondHealth);
apps/orchestrator-api/src/server_app.ts:1715:  app.get("/api/ops/metrics", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1725:  app.get("/api/ops/errors", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1739:  app.get("/api/ops/queue", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1751:  app.post("/api/projects/intake", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1785:  app.get("/api/projects/:projectId/intake/sources", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1796:  app.get("/api/projects/:projectId/intake/sources/:sourceId", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1809:  app.post("/api/projects/:projectId/intake/source", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1887:  app.post("/api/projects/:projectId/intake/pasted-text", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:1972:  app.post("/api/projects/:projectId/intake/github", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2082:  app.post("/api/projects/:projectId/intake/cloud-link", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2167:  app.post("/api/projects/:projectId/intake/local-manifest", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2250:  app.post("/api/projects/:projectId/intake/file", (req, res, next) => {
apps/orchestrator-api/src/server_app.ts:2532:  app.post("/api/projects/:projectId/spec/analyze", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2568:  app.post("/api/projects/:projectId/spec/clarify", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2587:  app.post("/api/projects/:projectId/spec/assumptions/accept", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2622:  app.post("/api/projects/:projectId/spec/recommendations/apply", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2649:  app.post("/api/projects/:projectId/spec/build-contract", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2673:  app.post("/api/projects/:projectId/spec/approve", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2700:  app.get("/api/projects/:projectId/spec/status", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2738:  app.post("/api/projects/:projectId/self-upgrade/spec", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2766:  app.get("/api/projects/:projectId/self-upgrade/status", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2790:  app.post("/api/projects/:projectId/repo/completion-contract", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2831:  app.get("/api/projects/:projectId/repo/status", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2855:  app.post("/api/projects/:projectId/universal/capability-pipeline", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2880:  app.get("/api/projects/:projectId/universal/capability-pipeline", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2893:  app.post("/api/projects/:projectId/autonomous-build/start", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2928:  app.get("/api/projects/:projectId/autonomous-build/status", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2971:  app.post("/api/projects/:projectId/autonomous-build/resume", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:2999:  app.post("/api/projects/:projectId/autonomous-build/approve-blocker", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3035:  app.post("/api/projects/:projectId/operator/send", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3707:  app.post("/api/projects/:projectId/compile", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3721:  app.post("/api/projects/:projectId/plan", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3740:  app.post("/api/projects/:projectId/dispatch/execute-next", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3759:  app.post("/api/projects/:projectId/repair/replay", requireRole("admin", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3793:  app.get("/api/projects/:projectId/status", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3805:  app.get("/api/projects/:projectId/state", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3839:  app.get("/api/projects/:projectId/resume", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3862:  app.get("/api/projects/:projectId/runtime", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3890:  app.get("/api/projects/:projectId/execution", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3918:  app.get("/api/projects/:projectId/execution/:runId", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3946:  app.get("/api/projects/:projectId/ui/overview", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3957:  app.get("/api/projects/:projectId/ui/packets", async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3968:  app.get("/api/projects/:projectId/ui/artifacts", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3979:  app.get("/api/projects/:projectId/ui/gate", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:3991:  app.get("/api/projects/:projectId/ui/proof-status", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4006:  app.get("/api/projects/:projectId/ui/security-center", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4061:  app.post("/api/projects/:projectId/security-center/dependency-scan", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4096:  app.post("/api/projects/:projectId/governance/approval", requireRole("admin", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4152:  app.post("/api/projects/:projectId/deploy/promote", requireRole("admin", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4192:  app.post("/api/projects/:projectId/deploy/rollback", requireRole("admin", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4238:  app.get("/api/projects/:projectId/ui/deployments", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server_app.ts:4250:  app.get("/api/projects/:projectId/ui/audit", requireRole("reviewer", config), async (req, res) => {
apps/orchestrator-api/src/server.ts:267:app.get("/api/health", (req, res) => {
apps/orchestrator-api/src/server.ts:280:app.post("/api/projects/intake", async (req, res) => {
apps/orchestrator-api/src/server.ts:302:app.post("/api/projects/:projectId/compile", async (req, res) => {
apps/orchestrator-api/src/server.ts:329:app.post("/api/projects/:projectId/plan", async (req, res) => {
apps/orchestrator-api/src/server.ts:351:app.post("/api/projects/:projectId/git/result", async (req, res) => {
apps/orchestrator-api/src/server.ts:375:app.post("/api/projects/:projectId/dispatch/execute-next", async (req, res) => {
apps/orchestrator-api/src/server.ts:499:app.get("/api/projects/:projectId/status", async (req, res) => {
apps/orchestrator-api/src/capabilitiesStandalone.ts:60:  app.get("/registry/capabilities", requireApiAuth, (_req, res) => {
apps/orchestrator-api/src/capabilitiesStandalone.ts:64:  app.get("/api/registry/capabilities", requireApiAuth, (_req, res) => {
```

## 4. Enterprise gap scorecard

| Category | Score | Rationale |
| --- | ---: | --- |
| Core orchestration | 42/100 | Core compile/plan/queue/worker code exists, but durable end-to-end, restart, idempotency, dead-letter, and real executor proofs are missing. |
| UI/product | 48/100 | Current Next routes build and VibeDashboard is live, but live-builder commercial capability, no-demo proof, accessibility, responsiveness, and navigation coverage are incomplete. |
| Security/auth | 35/100 | OIDC/bearer/role code exists, but anonymous/dev bypass proof, route matrix, tenant isolation, rate limiting, CSRF, service-key boundary, and full secret scan proof are missing. |
| Tenant isolation/RBAC | 20/100 | Role model exists, but project ownership/tenant columns and negative isolation proofs are missing. |
| Data/privacy | 18/100 | Durable tables exist, but retention, export, deletion, backups, restore, AI data handling, and evidence/log retention are not customer-ready. |
| Deployment/ops | 45/100 | Vercel/Railway/Supabase config exists, but staging/prod separation, smoke, production rollback, and reproducibility proofs are incomplete. |
| Observability | 55/100 | Metrics/errors/queue/health endpoints exist, but per-stage correlation/alerts and incident workflows are incomplete. |
| Validators/proof | 30/100 | Many validators/proofs exist, but root validation is red and stale validators/overconfident final passes undermine release evidence. |
| Legal/commercial | 15/100 | Claim-boundary docs exist, but customer-ready legal docs and billing/entitlement enforcement are missing/unproven. |
| Docs/onboarding | 50/100 | README/DEPLOY/install docs exist, but enterprise admin/support/API/data/compliance docs and changelog are incomplete. |
| Cleanup/debt | 40/100 | Prior census exists, but stale validators, legacy entrypoint, historical artifacts, duplicate CSS questions, and overclaim cleanup remain. |

## 5. P0 launch blockers
- **GAP-001 (P0) Root test command fails on deleted ProDashboard path** — Current root tests cannot be used as launch gate because they fail before exercising current VibeDashboard/AppShell path. Proof needed: Updated root test suite passes against canonical AppShell/VibeDashboard routes and fails on regressions.
- **GAP-002 (P0) Full validation is red with 18 failing validators** — Validation registry is not green and includes stale or incomplete UI/live-builder checks. Proof needed: `npm run validate:all` passes after stale validators are corrected and missing proofs added.
- **GAP-003 (P0) No proven tenant/project ownership isolation** — Project access appears keyed primarily by project ID, with no current proof that one authenticated user cannot access another project. Proof needed: Negative-path tenant isolation test covering UI/API/job/evidence access across two users and durable database RLS/policies.
- **GAP-004 (P0) Development auth-disabled/anonymous path exists and must be impossible in production** — There is a safe commercial guard, but deployment proof must show production cannot run with RUNTIME_MODE unset/development or with auth disabled while publicly reachable. Proof needed: Production boot test and deployment smoke proving public env refuses missing auth and cannot start with disabled auth.
- **GAP-005 (P0) Many project routes lack visible requireRole wrapper** — Route-level auth is inconsistent: high-sensitivity flows rely on getVerifiedAuth/getRequestActor internally or no wrapper instead of uniform route middleware. Proof needed: Route authorization matrix plus negative-path tests for every route.
- **GAP-006 (P0) No current full secret scan across source, history, evidence, logs, and UI** — Secret-scan proof is incomplete for the full enterprise boundary requested here. Proof needed: `proof:no-secrets` covering source, git history, release evidence, receipts, logs, generated apps, UI responses, and redaction assertions.
- **GAP-007 (P0) No proven real end-to-end orchestration path under durable mode** — Current proof is fragmented and mixed with local/mock evidence; enterprise-grade durable E2E proof is missing. Proof needed: `proof:orchestration-core` that runs the full durable path, restarts services, and verifies final app/materialization/evidence.
- **GAP-008 (P0) Durable/Supabase outage can silently downgrade to memory/development mode** — Fallback protects local dev but is unsafe if reachable production ever downgrades to ephemeral memory. Proof needed: Production-mode startup test proving Supabase outage aborts or fails readiness rather than accepting traffic.
- **GAP-009 (P0) Dashboard route validator expects deleted/replaced `/vibe` path** — A stale validator makes route integrity signal unreliable. Proof needed: Updated validator verifies `/projects/[projectId]` renders VibeDashboard/AppShell and old route decisions are explicit.
- **GAP-010 (P0) Core legal/commercial documents are missing** — Repo contains claim-boundary docs but not customer-ready legal/commercial docs. Proof needed: Legal document checklist reviewed by counsel and linked in product/docs.
- **GAP-011 (P0) Billing, plan, usage, and entitlement enforcement are absent or unproven** — If Botomatic is paid SaaS, monetization controls are not proven in live product. Proof needed: Billing/entitlement integration tests plus product routes and server-side enforcement proof.
- **GAP-046 (P0) Missing proof:tenant-isolation** — Tenant isolation is unknown. Proof needed: Add and run proof:tenant-isolation as machine-readable JSON plus human-readable evidence.

## 6. P1 private-beta blockers
- **GAP-012 (P1) Duplicate enqueue protection is incomplete/unknown** — Same packet may be enqueued multiple times unless a deeper constraint exists outside observed schema. Proof needed: Concurrent enqueue/idempotency test and DB uniqueness constraint proof.
- **GAP-013 (P1) Dead-letter/retry/stuck-job lifecycle is not enterprise-proven** — Current queue can reclaim expired jobs but lacks proven retry budgets/dead-letter operational path. Proof needed: Queue failure-mode test suite: worker crash, executor failure, stuck lease, retry exhaustion, dead-letter, alert.
- **GAP-014 (P1) Restart/resume behavior not proven across API, worker, runner, and UI** — Restart/resume is implemented in pieces but lacks launch-grade proof. Proof needed: Durable restart proof that kills/restarts services mid-build and verifies no duplicate/lost work.
- **GAP-015 (P1) Vibe Builder commercial usefulness is not proven** — Core UI exists but multiple commercial live-builder capabilities are incomplete or failing validation. Proof needed: End-to-end Vibe Builder proof editing a real project, syncing source, previewing, validating, exporting/deploying.
- **GAP-016 (P1) Live UI fake/demo/seed leakage not fully proven absent** — Hardcoded UI affordances may be fine, but live-data boundary is unproven. Proof needed: No-demo-live-ui validator scanning rendered pages/API responses and verifying demo mode gates.
- **GAP-017 (P1) Accessibility/responsiveness proof missing** — No current accessibility/responsive proof for canonical AppShell/VibeDashboard routes. Proof needed: Playwright/aXe/responsive screenshot proof for all customer-facing routes.
- **GAP-018 (P1) No rate limiting or abuse protection proof** — High-cost AI/build routes may be callable repeatedly without proven throttling. Proof needed: Rate-limit tests for auth failures, operator/send, intake/upload, and executor dispatch.
- **GAP-019 (P1) CSRF/browser-origin protection is not proven** — CSRF applicability is unknown because auth/session model is not fully documented/proven. Proof needed: Security proof documenting auth transport and CSRF negative tests where applicable.
- **GAP-020 (P1) Service-role key boundary and RLS posture unproven** — No proof that service-role key cannot leak to frontend/logs and no DB-level tenant isolation policy. Proof needed: Secret-boundary test plus Supabase RLS/policy proof.
- **GAP-021 (P1) Data retention/deletion/export lifecycle missing** — Customer data lifecycle is not defined or proven. Proof needed: `proof:data-retention` covering create/export/delete/retention/evidence/log cleanup.
- **GAP-022 (P1) Backup/restore process is missing** — Durability does not include proven backups/restores. Proof needed: Backup/restore drill evidence with RPO/RTO and rollback validation.
- **GAP-023 (P1) Staging/production separation is not proven** — Deployment config exists but environment separation proof is missing. Proof needed: Staging/prod smoke evidence with distinct env manifests and blocked cross-env access.
- **GAP-024 (P1) Production smoke and rollback proof incomplete** — Rollback exists in code but release-grade smoke/rollback proof is incomplete. Proof needed: `proof:deployment-smoke` for staging/prod plus rollback drill evidence.
- **GAP-025 (P1) Stage-level observability is partial** — Observability exists but not proven complete across intake/compile/plan/queue/worker/executor/materialization/validation. Proof needed: Stage observability proof with correlation IDs and alert negative-path tests.
- **GAP-026 (P1) Enterprise admin/operator/support docs missing or incomplete** — Docs are broad but not complete enough for enterprise procurement/onboarding. Proof needed: Docs review checklist and customer dry-run onboarding proof.
- **GAP-045 (P1) Missing proof:security-auth** — Security auth evidence is partial/fragmented. Proof needed: Add and run proof:security-auth as machine-readable JSON plus human-readable evidence.
- **GAP-047 (P1) Missing proof:no-demo-live-ui** — No-demo UI proof is missing. Proof needed: Add and run proof:no-demo-live-ui as machine-readable JSON plus human-readable evidence.
- **GAP-048 (P1) Missing proof:deployment-smoke** — Deployment smoke proof is missing/currently unverified. Proof needed: Add and run proof:deployment-smoke as machine-readable JSON plus human-readable evidence.
- **GAP-049 (P1) Missing proof:data-retention** — Data retention proof is missing. Proof needed: Add and run proof:data-retention as machine-readable JSON plus human-readable evidence.

## 7. P2 scale blockers
- **GAP-027 (P2) Memory-mode worker parity with durable mode is unproven** — Mode divergence can hide bugs in local validation. Proof needed: Mode parity test matrix for memory and durable queue/repository.
- **GAP-028 (P2) Executor reliability and sandboxing proof incomplete** — Executor path is present but enterprise safety/reliability proof is incomplete. Proof needed: Executor integration proof with timeout, failure, secret redaction, sandbox boundaries, and cost controls.
- **GAP-029 (P2) Commercial/pro cockpit route absent or intentionally replaced but not documented** — Product IA decision is not documented as enterprise target. Proof needed: Canonical route/product IA decision document and route validator.
- **GAP-030 (P2) Some validators pass despite current root gates failing** — Validator messaging is overconfident relative to global failure state. Proof needed: Meta-validator that blocks final readiness claims unless all required validators/tests pass.
- **GAP-031 (P2) No accepted enterprise-launch proof bundle** — Proof artifacts are fragmented and some stale. Proof needed: `proof:enterprise-launch` generating signed/dated JSON+MD evidence bundle.
- **GAP-032 (P2) CI gates do not include root `npm run test`, lint, or typecheck** — Current CI may omit known-failing root test and cannot run missing lint/typecheck. Proof needed: CI evidence showing build/test/validate/lint/typecheck all run and pass.
- **GAP-033 (P2) Railway/Vercel deployment reproducibility is incomplete** — Configs exist but reproducible deployment proof is incomplete. Proof needed: Clean-room staging/prod deployment proof with env manifest and smoke result.
- **GAP-034 (P2) AI vendor data handling and disclosure incomplete** — AI data processing boundary is not customer-ready. Proof needed: Privacy/DPA/AI disclosure docs plus tests proving prompt/output storage boundaries.
- **GAP-035 (P2) Dependency vulnerability gate not proven current** — Dependency risk is unknown for this audit. Proof needed: Dependency scan artifact with severity threshold and remediation/exception process.
- **GAP-036 (P2) Incident response and support workflow missing** — Operational response process is not defined in repo. Proof needed: Incident runbook and support workflow reviewed in tabletop exercise.
- **GAP-037 (P2) Historical receipts/generated artifacts create release-truth noise** — Old artifacts can be mistaken for current proof or leak stale claims. Proof needed: Evidence retention/archive policy and manifest marking current vs historical artifacts.
- **GAP-038 (P2) Overclaim wording remains in docs/evidence** — Claim-boundary policy exists but content still requires cleanup against current gate failures. Proof needed: Overclaim scan proof with allowlist for examples and current evidence links.
- **GAP-050 (P2) Missing proof:enterprise-launch** — Enterprise launch proof is missing. Proof needed: Add and run proof:enterprise-launch as machine-readable JSON plus human-readable evidence.

## 8. Core orchestration gap analysis

### Current path
Current evidence shows an orchestrator path through `apps/orchestrator-api/src/bootstrap.ts`, `server_app.ts`, intake routes, `compileProjectWithIntake`, plan generation, `enqueueJob`, `workerTick`, executor selection, GitHub/workspace materialization, validation, and status/evidence UI APIs.

### Required enterprise path
The required path is durable-only for commercial traffic: authenticated intake creates tenant-scoped durable project; compiler creates valid master truth/build contract; planner persists dependency-aware packet graph; queue uses idempotent durable jobs; worker executes with bounded retry/dead-letter; executor is sandboxed and observable; workspace/preview updates reliably; validation/evidence is generated; restart/resume is proven; stuck jobs alert; every stage has logs/metrics/correlation.

### Missing tests/proofs
- `proof:orchestration-core`
- Durable mode restart/resume proof
- Duplicate enqueue/idempotency proof
- Dead-letter/stuck-job proof
- Executor sandbox/timeout/failure proof
- Stage-level observability proof

### Stuck/failure modes
Current evidence leaves duplicate queue jobs, Supabase fallback-to-memory, worker crash recovery, executor failure, validation failure, replay behavior, and unblocked dependency wave progression as partially proven or unknown under enterprise conditions.

### Exact remediation plan
1. Freeze canonical orchestration path and write sequence diagram/runbook.
2. Add durable integration harness that provisions isolated project/tenant and runs intake -> compile -> plan -> queue -> worker -> executor -> materialization -> preview -> validation.
3. Add failure-mode tests for worker crash, executor timeout, validation fail, stuck lease, duplicate dispatch, replay, and dependency wave progression.
4. Add machine-readable proof artifact and fail release if any step is not durable, authenticated, observable, and idempotent.

## 9. Security/auth gap analysis

### Current auth modes
Observed config supports OIDC, bearer token, and disabled auth in development. Commercial mode requires durable repository and OIDC or API token, but bootstrap can change runtime/repository mode when Supabase is unreachable. Some routes use `requireRole`; many project routes visibly do not.

### Bypass risks
Anonymous actor fallback, route-level auth inconsistency, development auth disabled mode, public deployment misconfiguration, missing tenant isolation proof, missing rate limiting, and incomplete secret/history/evidence scans are all launch risks.

### Production fail-closed gaps
Production must prove it cannot start or serve traffic with `RUNTIME_MODE=development`, auth disabled, memory repository, or memory queue. Current code has guards but also a fallback path that intentionally avoids commercial/durable guard after Supabase failure.

### Route protection gaps
All project/intake/status/operator/compile/plan/runtime/evidence routes need an explicit auth/role matrix and negative-path tests. Reviewer/admin protected routes are not enough.

### Tenant isolation gaps
No current migration-level tenant/owner/RLS evidence was found. Project IDs alone are not an enterprise isolation boundary.

### Exact remediation plan
1. Add route auth matrix and tests.
2. Add tenant/owner/RLS model and negative tests.
3. Add production startup guard and deployment proof.
4. Add rate limiting/abuse controls.
5. Add full secret and dependency scan gates.
6. Add customer-facing security policy and incident process.

## 10. UI/product gap analysis

### Current routes/components
The Next build lists `/projects/new`, `/projects/[projectId]`, deployment/logs/evidence/validators/vault/settings/onboarding routes, and API proxy routes. The canonical route appears to be `/projects/[projectId]` with VibeDashboard/AppShell. Old `/vibe`, `/advanced`, `/commercial`, `/pro`, and `/cockpit` routes were not detected in the current route file list.

### Commercial Vibe Builder requirements
A commercially useful Vibe Builder must connect to real project/build data, edit real sources safely, preview changes, sync to source, generate/export/deploy full apps, show truthful validation/evidence, and handle errors/accessibility/responsive states.

### Fake/demo leakage
Hardcoded chips may be acceptable as UI affordances, but seed/demo data and generated evidence must not appear as live customer state. A dedicated `proof:no-demo-live-ui` is missing.

### Navigation gaps
Sidebar/command navigation exists visually in current components, but this audit did not find current route/navigation/a11y proof covering all customer routes.

### Exact remediation plan
1. Declare canonical product IA and route map.
2. Update validators to current route map.
3. Add Vibe Builder real-data end-to-end proof.
4. Add no-demo rendered UI proof.
5. Add accessibility/responsive/navigation/error-state proof.

## 11. Validator/proof gap analysis

### Stale validators
Stale examples include ProDashboard test expectations and dashboard route integrity requiring old `/vibe/page.tsx`. Several live UI builder validators fail because expected wave files are missing.

### Missing proofs
Required missing/incomplete proofs include `proof:orchestration-core`, `proof:security-auth`, `proof:tenant-isolation`, `proof:no-secrets`, `proof:no-demo-live-ui`, `proof:deployment-smoke`, `proof:data-retention`, and `proof:enterprise-launch`.

### Permissive validators
Some validators emit PASS messages for final launch/commercial readiness while global validation is red. Final readiness checks must aggregate required gate state and fail closed.

### Exact remediation plan
1. Split stale validator cleanup from product changes.
2. Make canonical path validators authoritative.
3. Add missing proof validators and machine-readable artifacts.
4. Add meta-gate: no final launch claim if any required test/validator/proof is red.

## 12. Deployment/ops gap analysis

### Staging/prod
Configs exist for Vercel/Railway/Supabase-style deployment, but staging/prod separation proof is missing.

### Health checks
Health routes exist, but enterprise readiness requires health/readiness split: health for process, readiness for durable DB/queue/auth/executor dependencies.

### Smoke tests
Dry-run and proof artifacts exist, but no current staging/prod smoke proof was run in this audit.

### Monitoring
Metrics/errors/queue endpoints and alert webhook support exist, but per-stage alerts/correlation and incident runbook proof are incomplete.

### Rollback
Deployment rollback routes exist, but backup/restore and production rollback drill proof are missing.

### Exact remediation plan
1. Define environment matrix.
2. Add readiness endpoint that fails on missing durable dependencies.
3. Add staging/prod smoke scripts.
4. Add rollback drill and backup/restore drill.
5. Add incident/support runbooks and alert tests.

## 13. Legal/commercial gap analysis

### Missing legal docs
Missing root legal/commercial docs include: LICENSE, NOTICE, TERMS.md, PRIVACY.md, SECURITY.md, DPA.md, SUBPROCESSORS.md, ACCEPTABLE_USE.md, SLA.md, BILLING.md, SUPPORT.md, CHANGELOG.md.

### Billing/plan gaps
No live Botomatic billing/Stripe/usage/entitlement enforcement proof was found. If Botomatic is paid SaaS, this is a commercial blocker.

### Compliance gaps
DPA/subprocessor, privacy, security policy, acceptable use, AI data handling disclosure, support terms, SLA, refund/cancellation, retention/export/deletion, and incident process are absent or incomplete.

### Exact remediation plan
1. Prepare legal doc pack with counsel.
2. Decide paid SaaS scope; if paid, implement billing/entitlement gates.
3. Add compliance/data handling docs and proof links.
4. Remove or proof-back all overclaims.

## 14. Cleanup and deletion gap analysis

### Stale files/routes/shells/CSS/generated artifacts
Do not delete anything now. Cleanup should wait until validators and canonical route map are fixed. Candidates include stale validators, legacy API entrypoint, historical receipts, generated artifacts, overclaim docs, and CSS ownership cleanup.

### Exact cleanup batches
1. Archive/label historical receipts and generated evidence after retention decision.
2. Update stale validators to canonical paths.
3. Document AppShell/VibeDashboard route consolidation.
4. Harden orchestration/auth before touching core files.
5. Remove/qualify overclaims.
6. Delete deprecated files only in separate PRs with reference proof.

## 15. Proofs required for enterprise-ready status

- **proof:orchestration-core** — durable authenticated full-path build proof.
- **proof:security-auth** — OIDC/bearer/disabled production fail-closed/route matrix proof.
- **proof:tenant-isolation** — two-tenant negative access proof across projects/jobs/evidence/logs/UI.
- **proof:no-secrets** — source, history, logs, evidence, UI, generated artifacts scan.
- **proof:no-demo-live-ui** — rendered live UI/API scan with demo disabled.
- **proof:deployment-smoke** — staging and production smoke plus rollback evidence.
- **proof:data-retention** — retention/export/delete/log/evidence lifecycle proof.
- **proof:enterprise-launch** — single fail-closed rollup of all enterprise gates.

## 16. Final enterprise launch roadmap

- **Batch 0: freeze and census** — keep current audits, freeze canonical paths, declare no-go status.
- **Batch 1: core orchestration 100/100** — durable E2E, idempotency, dead-letter, restart, executor, preview, evidence.
- **Batch 2: validators/proofs fail-closed** — stale validator cleanup, missing proofs, meta-gate.
- **Batch 3: security/auth/tenant isolation** — route matrix, tenant/RLS, production fail-closed, rate limiting, secret/dependency scans.
- **Batch 4: deployment/ops** — env separation, readiness, smoke, rollback, backups, alerts, incident runbooks.
- **Batch 5: UI/product polish** — Vibe real-data workflow, no-demo proof, a11y/responsive/nav/error state coverage.
- **Batch 6: legal/commercial** — legal pack, privacy/security/DPA/subprocessors/AUP/SLA/support, billing/entitlements if paid.
- **Batch 7: cleanup/deletion** — archive historical artifacts, delete deprecated files only with proof.
- **Batch 8: release candidate and launch gate** — run complete evidence bundle, tag release, changelog, staging/prod smoke, rollback drill.

## 17. Final go/no-go checklist

### Before private beta
- Root `npm run test` passes.
- `npm run validate:all` passes with stale validators corrected.
- Durable orchestration E2E proof passes.
- Auth cannot be disabled in any public/private-beta environment.
- Tenant isolation negative proof passes.
- No-secrets and no-demo-live-ui proofs pass.
- Basic support/incident process exists.
- Private-beta terms/privacy/security disclaimers exist.

### Before public paid launch
- All private-beta gates pass.
- Staging and production smoke tests pass.
- Rollback and backup/restore drills pass.
- Billing/entitlement/usage enforcement exists if paid.
- Legal pack complete and linked.
- Accessibility/responsive/navigation proofs pass.
- Changelog/version/release notes exist.
- Overclaim scan passes.

### Before enterprise sale
- All public paid launch gates pass.
- SSO/OIDC and RBAC are proven for enterprise roles.
- Tenant isolation/RLS proof is current.
- DPA/subprocessors/SLA/support/security policy complete.
- Audit logs/export/deletion/retention controls proven.
- Incident response and support escalation tested.
- Enterprise launch proof bundle is approved.

## Gap summary

- total gaps found: 50
- P0 count: 12
- P1 count: 19
- P2 count: 13
- P3 count: 6
- public-launch blockers count: 41
- private-beta blockers count: 30
- enterprise-sale blockers count: 45
- recommended current launch status: no-go
