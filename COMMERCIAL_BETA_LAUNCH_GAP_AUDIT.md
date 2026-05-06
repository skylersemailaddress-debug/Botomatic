# Commercial beta friends-and-family launch gap audit

Date: 2026-05-06T04:38:05Z

## Executive status

- Current branch: `work`.
- Current audited commit before this audit update: `9e6ccf527fb87125331b03cc7f5063172b70aa5c`.
- Main readiness status: **not ready to claim commercial beta readiness from main** until this branch is merged and the proof commands pass on `main`.
- Friends-and-family readiness status: **not ready for unsupervised real-user commercial beta**. It is only plausible as a tightly supervised internal/friends pilot after merge-to-main proof, explicit tester caveats, manual monitoring, and no promise of durable recovery, production deployment, or real external-executor success.
- Local proof status after rerun: `proof:orchestration-core` is present and passes as an in-memory orchestration-core proof with score **100/100**.
- Worker/wave proof present: **yes**.
- Public launch readiness claim allowed: **no**. The proof is intentionally scoped to local memory-mode orchestration; main-branch proof, current-environment durable/auth reruns, external executor proof, and deployment proof remain open blockers.
- Gap-closure update: the friends-and-family operations packet and automated readiness audit script now exist; credentialed/runtime gaps remain blocked by missing environment credentials or main-branch reruns.

## Commands rerun for this audit

| Command | Result | Note |
| --- | --- | --- |
| `npm run build` | PASS | Next.js control-plane build completed. |
| `npm run test` | PASS | Now runs `test:wave-025`, `test:wave-026`, and `test:orchestration-core`. |
| `npm run validate:all` | PASS | 78/78 validators passed. Some validators still make broad launch-readiness assertions, so this audit remains the controlling launch-claim boundary. |
| `npm run proof:orchestration-core` | PASS | Local in-memory orchestration proof passed with score 100/100. |
| `npm run audit:friends-family-beta` | PASS (audit completed) | Audit produced `friends-family-beta-readiness.json` with readiness `not_ready_all_gaps_not_closed`; it does not claim readiness. |

## Branch and commit inspection

- Visible local branch set: `work` only.
- Visible remote branch set: none in this checkout.
- The reported commit `fea564272060ec54e40d2935df3eb6a2f8be0933` is **not present** in the local object database.
- The GitHub Actions full build path proof workflow is present at `.github/workflows/full-build-path-proof.yml`.
- Because the reported proof commit was unavailable locally, the minimal worker/wave proof changes were recreated on the current branch rather than cherry-picked.

## Reconciled proof surface

| Required surface | Status | Evidence |
| --- | --- | --- |
| `scripts/proof-orchestration-core.cjs` | Present | Node wrapper for the proof runner |
| `package.json` script `proof:orchestration-core` | Present | Runs `node scripts/proof-orchestration-core.cjs` |
| `package.json` script `test` includes orchestration regression | Present | `npm run test` now includes `test:orchestration-core` |
| `orchestrationCoreWorkerWave.test.ts` | Present | Regression test for wave dependencies, deduping, claims, finalization, and proof harness |
| In-memory queue records | Present | `InMemoryOrchestrationQueue` stores queue records and stats |
| Enqueue de-duplication | Present | Queue key is `projectId:packetId`; duplicate enqueues return the existing job |
| Worker claiming | Present | `claim(workerId)` transitions the first queued job to running in memory |
| Job finalization | Present | `finalize(jobId, status)` records success/failure, completion time, and errors |
| Wave dependency assignment | Present | Later-wave packets depend on the previous wave when explicit dependencies are absent |
| Dependent packet enqueueing | Present | Runnable packets enqueue only after dependencies complete |
| Worker materialization | Present | Proof materializes a generated workspace under `release-evidence/runtime/generated-workspaces` |
| AtlasCRM generated workspace | Present | Generated files include an AtlasCRM app, validation evidence, and README |
| Updated full build proof docs/json | Present | `BOTOMATIC_FULL_BUILD_PROOF.md`, `botomatic-full-build-proof.json`, and `BOTOMATIC_FULL_BUILD_PROOF.json` |

## Friends-and-family beta decision

### Decision

**No-go for unsupervised friends-and-family commercial beta.**

**Conditional go only for a supervised pilot** if all of the following are true before inviting testers:

1. Merge this branch to `main`.
2. Rerun `npm run build`, `npm run test`, `npm run validate:all`, and `npm run proof:orchestration-core` on `main`.
3. Tell testers this is a supervised workflow/orchestration pilot, not a production-ready launch.
4. Do not promise durable recovery, live deployment, protected multi-tenant commercial access, or real external executor success until those proofs are captured.
5. Monitor every tester run manually and capture failure evidence.
6. Use only approved secret injection; do not hardcode credentials.
7. Use `FRIENDS_AND_FAMILY_BETA_OPERATIONS_PACKET.md` as the tester/operator runbook.
8. Run `npm run audit:friends-family-beta` before invites and confirm every required gate for the scoped pilot is either passed or explicitly out of scope.

## Audit classification

### P0 blockers

1. **Main proof not yet established.** This branch contains the proof, but `main` cannot truthfully claim it until the branch is merged and proof commands pass on `main`.
2. **Durable restart/resume proof is still open.** Supabase durable queue/repository behavior is not proven by the local in-memory proof. Remediation: run durable proof with real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` supplied through approved secret channels.
3. **External executor proof is still open.** The local proof does not prove Anthropic/OpenAI/external executor-backed app generation. Remediation: run the full build path with a real executor credential and verify generated output is created by that path.
4. **Auth/protected route proof is open for commercial beta.** Auth-disabled local proof cannot support friends/family testers using protected commercial routes without additional proof.
5. **Public launch readiness must not be claimed.** Main cannot truthfully claim public launch readiness until all required proof gates pass from main.

### P1 blockers

1. **Deployment smoke/rollback proof remains open.** Remediation: run credential-gated deployment dry-run or approved preview deployment proof with smoke and rollback evidence if beta includes deployment.
2. **F&F operations packet is now closed locally.** `FRIENDS_AND_FAMILY_BETA_OPERATIONS_PACKET.md` documents tester scope, caveats, monitoring, incident response, rollback/disable, and privacy/logging boundaries.
3. **Automated F&F readiness audit is now closed locally.** `npm run audit:friends-family-beta` writes `friends-family-beta-readiness.json`; the latest audit remains `not_ready_all_gaps_not_closed` because credentialed/main gates are still open.

### Branch/merge blockers

1. **Missing reported commit/branch.** Commit `fea564272060ec54e40d2935df3eb6a2f8be0933` is not available locally, so there is no exact branch to merge from this checkout.
2. **This branch must merge before main can prove the new script.** Exact branch to merge: `work` into `main`.

### Proof blockers

1. **Closed locally:** `proof:orchestration-core` passes and writes proof artifacts.
2. **Closed in regular test command on this branch:** `npm run test` now includes the orchestration-core regression.
3. **Closed locally for F&F readiness audit automation:** `npm run audit:friends-family-beta` exists and emits machine-readable remaining gates.
4. **Open until rerun on main:** main proof cannot be claimed until this branch is merged and the proof passes on main.
5. **Open for real beta:** external executor output, current-environment durable restart/resume, current-environment protected auth, and deployment smoke/rollback are not proven by this local proof.

### Deployment blockers

1. Live deployment execution requires approved credentials and must stay blocked-by-default without them.
2. Durable production data plane/restart-resume proof is not satisfied by memory-mode evidence.
3. Preview URL / generated workspace sharing should not be promised until deployment or preview proof is captured.

### Security/secrets blockers

1. No hardcoded secrets were introduced.
2. Real proof credentials must be injected through approved secret management only.
3. Auth-disabled local proof cannot be marketed as commercial protected-route readiness.
4. Friends/family testers should not receive broad admin credentials; use least-privilege invite/test credentials only after auth proof.

### Claim/marketing blockers

1. Allowed claim after this branch: local orchestration-core worker/wave proof exists and passes.
2. Allowed F&F wording only after main proof: supervised pilot for workflow/orchestration feedback with known limitations.
3. Disallowed claim: public launch ready, production deployment ready, durable queue ready, protected commercial auth proven, or external executor proven.

### Cleanup-only items

1. Proof JSON naming includes both `botomatic-full-build-proof.json` and `BOTOMATIC_FULL_BUILD_PROOF.json` for compatibility. Standardizing naming is cleanup-only and should happen only after downstream references are checked.
2. Generated AtlasCRM workspace under `release-evidence/runtime/generated-workspaces` is evidence-only; it should not be confused with a real customer app build.

## Exact PRs/branches to merge

1. Merge the current branch, `work`, into `main` as the proof/orchestration-worker-wave PR.
2. No other exact branch/PR is visible in this local checkout for commit `fea564272060ec54e40d2935df3eb6a2f8be0933`.

## Exact next remediation order

1. Merge `work` into `main`.
2. On `main`, run `npm run build`, `npm run test`, `npm run validate:all`, and `npm run proof:orchestration-core`.
3. Decide whether friends-and-family beta includes real external executor app generation. If yes, provision approved executor credentials and prove the fresh-project path.
4. Provision approved durable Supabase proof credentials and rerun durable queue/restart-resume proof.
5. Configure and prove protected auth for invited testers.
6. If beta includes deployment or preview sharing, run credential-gated deployment dry-run/preview proof and smoke/rollback evidence.
7. Run `npm run audit:friends-family-beta` and verify `friends-family-beta-readiness.json` has no remaining gaps for the scoped pilot.
8. Use `FRIENDS_AND_FAMILY_BETA_OPERATIONS_PACKET.md` for invite caveats, monitoring, support, incident response, disable/rollback, and privacy/logging.
9. Only after all applicable main proof gates pass, invite friends/family testers with bounded claims.
