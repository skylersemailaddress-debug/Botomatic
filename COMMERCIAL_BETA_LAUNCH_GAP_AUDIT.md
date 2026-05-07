# Commercial beta launch gap audit

Date: 2026-05-06

## Executive status

- Current branch: `work`.
- Main readiness status: **not ready for public launch**.
- Local proof status after reconciliation: `proof:orchestration-core` is present and passes as an in-memory orchestration-core proof with score **100/100**.
- Worker/wave proof present: **yes**.
- Public launch readiness claim allowed: **no**. The proof is intentionally scoped to local memory-mode orchestration; durable Supabase restart/resume, configured auth, external executor, and deployment proof remain open blockers.

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
| `orchestrationCoreWorkerWave.test.ts` | Present | Regression test for wave dependencies, deduping, claims, finalization, and proof harness |
| In-memory queue records | Present | `InMemoryOrchestrationQueue` stores queue records and stats |
| Enqueue de-duplication | Present | Queue key is `projectId:packetId`; duplicate enqueues return the existing job |
| Worker claiming | Present | `claim(workerId)` atomically transitions the first queued job to running in memory |
| Job finalization | Present | `finalize(jobId, status)` records success/failure, completion time, and errors |
| Wave dependency assignment | Present | Later-wave packets depend on the previous wave when explicit dependencies are absent |
| Dependent packet enqueueing | Present | Runnable packets enqueue only after dependencies complete |
| Worker materialization | Present | Proof materializes a generated workspace under `release-evidence/runtime/generated-workspaces` |
| AtlasCRM generated workspace | Present | Generated files include an AtlasCRM app, validation evidence, and README |
| Updated full build proof docs/json | Present | `BOTOMATIC_FULL_BUILD_PROOF.md`, `botomatic-full-build-proof.json`, and `BOTOMATIC_FULL_BUILD_PROOF.json` |

## Audit classification

### P0 blockers

1. **Durable restart/resume proof is still open.** Supabase durable queue/repository behavior is not proven by the local in-memory proof. Remediation: run durable proof with real `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` supplied through approved secret channels.
2. **External executor proof is still open.** The local proof does not prove Anthropic/OpenAI/external executor-backed app generation. Remediation: run the full build path with a real executor credential and verify generated output is created by that path.
3. **Public launch readiness must not be claimed.** Main cannot truthfully claim public launch readiness until all required proof gates pass from main.

### P1 blockers

1. **Protected route/auth proof is not proven locally.** Remediation: configure bearer/OIDC proof without hardcoded secrets and prove protected commercial routes.
2. **Deployment smoke/rollback proof remains open.** Remediation: run credential-gated deployment dry-run or approved preview deployment proof with smoke and rollback evidence.

### Branch/merge blockers

1. **Missing reported commit/branch.** Commit `fea564272060ec54e40d2935df3eb6a2f8be0933` is not available locally, so there is no exact branch to merge from this checkout.
2. **This branch must merge before main can prove the new script.** Exact branch to merge: `work` into `main`.

### Proof blockers

1. **Closed locally:** `proof:orchestration-core` passes and writes proof artifacts.
2. **Open until rerun on main:** main proof cannot be claimed until this branch is merged and the proof passes from main.

### Deployment blockers

1. Live deployment execution requires approved credentials and must stay blocked-by-default without them.
2. Durable production data plane/restart-resume proof is not satisfied by memory-mode evidence.

### Security/secrets blockers

1. No hardcoded secrets were introduced.
2. Real proof credentials must be injected through approved secret management only.
3. Auth-disabled local proof cannot be marketed as commercial protected-route readiness.

### Claim/marketing blockers

1. Allowed claim after this branch: local orchestration-core worker/wave proof exists and passes.
2. Disallowed claim: public launch ready, production deployment ready, durable queue ready, or external executor proven.

### Cleanup-only items

1. Proof JSON naming now includes both `botomatic-full-build-proof.json` and `BOTOMATIC_FULL_BUILD_PROOF.json` for compatibility. Standardizing naming is cleanup-only and should happen only after downstream references are checked.

## Exact PRs/branches to merge

1. Merge the current branch, `work`, into `main` as the proof/orchestration-worker-wave PR.
2. No other exact branch/PR is visible in this local checkout for commit `fea564272060ec54e40d2935df3eb6a2f8be0933`.

## Exact next remediation order

1. Merge `work` into `main`.
2. On `main`, run `npm run build`, `npm run test`, `npm run validate:all`, and `npm run proof:orchestration-core`.
3. Provision approved durable Supabase proof credentials and rerun durable queue/restart-resume proof.
4. Provision approved external executor and auth proof credentials without hardcoding secrets, then rerun protected build-path proof.
5. Run credential-gated deployment dry-run or preview proof with smoke and rollback evidence.
6. Only after all main proof gates pass, update claim/marketing readiness language.
