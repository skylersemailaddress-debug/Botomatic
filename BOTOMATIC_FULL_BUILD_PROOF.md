# Botomatic Full Build-Path Proof

## 1. Executive result

**Status: BLOCKED.** Botomatic's full build path was **not proven** in this run. The repository baseline commands passed, but the proof scenario could not create a fresh project because the actual API entrypoint failed startup before serving project intake routes.

The blocking startup log from `npm run api:start` was:

```json
{"event":"startup_env_error","missing":["ANTHROPIC_API_KEY"]}
```

This was treated as a blocker, not a pass, because the task explicitly forbids fake proof success and requires `executor_unavailable`/Anthropic unavailability to be recorded as a blocker.

## 2. Score

**Score: 0 / 100**

| Category | Points possible | Points awarded | Result |
| --- | ---: | ---: | --- |
| Intake/project creation | 10 | 0 | Blocked before API startup |
| Compile/plan persistence | 15 | 0 | Not reached |
| Packet/job enqueue correctness | 10 | 0 | Not reached |
| Worker execution | 15 | 0 | Not reached |
| Wave progression | 15 | 0 | Not reached |
| Workspace materialization | 10 | 0 | Not reached |
| Preview/output readiness | 5 | 0 | Not reached |
| Validation/evidence | 10 | 0 | Runtime validators against generated output not reached |
| Failure visibility | 5 | 0 | Startup failure was visible in terminal output, but no job failure path could be exercised |
| Restart/resume | 5 | 0 | Untested; durable mode unavailable |

## 3. Current branch/commit

- Branch: `work`
- Commit SHA at proof start: `3d5ef82cb2b40a83a62b86b2fae525278e32d1ed`
- Initial `git status --short`: clean output/no tracked changes reported.

## 4. Environment baseline

| Item | Observed value |
| --- | --- |
| Current date | 2026-05-06 UTC |
| Node version | `v20.19.6` |
| npm version | `11.4.2` |
| Package manager | npm (`package-lock.json` present) |
| Available package scripts | Retrieved with `npm pkg get scripts --json`; key proof scripts include `build`, `test`, `validate:all`, `api:start`, `api:dev`, `start:local`, `proof:*`, and validator/test scripts. |
| Repo mode | `memory` by default because `PROJECT_REPOSITORY_MODE` is missing and config defaults to memory in development mode. |
| Durable storage availability | `false`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are missing. |
| Executor availability | `false`; `ANTHROPIC_API_KEY`, `EXECUTOR`, `CLAUDE_EXECUTOR_URL`, and `CLAUDE_EXECUTOR_KEY` are missing. |
| Auth mode | `disabled`; `API_AUTH_TOKEN` and OIDC settings are missing, and development mode permits disabled auth. |
| API/server can start | `false` under actual `npm run api:start`; startup exits with missing `ANTHROPIC_API_KEY`. |
| Worker can start | `false` in this proof environment because the queue worker is started by the API app construction path, and the bootstrap exits before building the app. |

### Required/proof-relevant env vars, redacted

| Env var | Present? | Redacted value / note |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Missing | Required by API bootstrap; missing caused startup failure. |
| `API_AUTH_TOKEN` | Missing | Bearer auth unavailable. |
| `SUPABASE_URL` | Missing | Durable repository/queue unavailable. |
| `SUPABASE_SERVICE_ROLE_KEY` | Missing | Durable repository/queue unavailable. |
| `PROJECT_REPOSITORY_MODE` | Missing | Defaults to memory mode. |
| `QUEUE_BACKEND` | Missing | Supabase queue not configured. |
| `EXECUTOR` | Missing | Defaults away from real Claude executor configuration. |
| `CLAUDE_EXECUTOR_URL` | Missing | Real executor endpoint unavailable. |
| `CLAUDE_EXECUTOR_KEY` | Missing | Real executor auth unavailable. |
| `GITHUB_TOKEN` | Missing | GitHub branch/commit/PR packet path unavailable. |
| `OIDC_ISSUER_URL` | Missing | OIDC unavailable. |
| `OIDC_CLIENT_ID` | Missing | OIDC unavailable. |
| `OIDC_AUDIENCE` | Missing | OIDC unavailable. |
| `RUNTIME_MODE` | Missing | Defaults to development mode. |

## 5. Commands run

| Command | Result | Notes |
| --- | --- | --- |
| `git branch --show-current` | Passed | Returned `work`. |
| `git rev-parse HEAD` | Passed | Returned `3d5ef82cb2b40a83a62b86b2fae525278e32d1ed`. |
| `git status --short` | Passed | No output. |
| `node -v` | Passed | Returned `v20.19.6`. |
| `npm -v` | Passed with npm warning | Returned `11.4.2`; npm also warned about unknown env config `http-proxy`. |
| `npm pkg get scripts --json` | Passed with npm warning | Returned package script inventory. |
| env presence probe | Passed | Confirmed required proof env vars were missing. |
| `npm run build` | Passed | Next.js control-plane production build completed. |
| `npm run test` | Passed | `test:wave-025` and `test:wave-026` passed. |
| `npm run validate:all` | Passed | 78/78 validators passed. |
| `timeout 8s npm run api:start` | Failed as expected/blocker | Exited code 1 with `startup_env_error` for missing `ANTHROPIC_API_KEY`. |

## 6. Fresh project details

- Required proof prompt: `Build a small commercial landing page app for a fictional product called AtlasCRM. It needs a hero section, pricing cards, testimonials, FAQ, contact form UI, and a launch-readiness checklist. Generate real app files and validation evidence.`
- Fresh project ID: **not created**.
- Project persisted: **false**.
- Intake prompt/source stored: **false**.

Reason: creating a project requires the API intake route. The actual `npm run api:start` command failed before routes were available. I did not inject dummy keys, use the mock executor, use seeded data, or patch around the failure because that would violate the proof rules.

## 7. Step-by-step proof results

### 7.1 Intake/project creation

- Project ID created: **No**.
- Project persisted: **No**.
- Intake prompt/source data stored: **No**.
- Result: **Blocked** by API startup failure.

### 7.2 Compile/plan

- Compile path runs: **No**.
- Compiled plan exists: **No**.
- Plan persisted before jobs enqueue: **No**.
- Packets exist: **No**.
- Job packet IDs match persisted packet IDs: **Not testable**.
- Root packet count > 0: **No**.
- Wave/dependency metadata exists if applicable: **Not testable**.
- Result: **Not reached**.

### 7.3 Queue/enqueue

- Root jobs enqueue: **No**.
- Duplicate root jobs not created: **Not testable**.
- Queue/job list reflects pending work: **No**.
- Result: **Not reached**.

### 7.4 Worker execution

- Worker starts: **No**.
- Jobs claimed: **No**.
- Jobs transition pending → executing → complete or failed: **No**.
- Failures visible, not silent: **Startup failure visible; job failure path not reached**.
- Result: **Blocked**.

### 7.5 Wave progression

- Wave 0 completes: **No**.
- Dependent packets enqueue after prerequisites complete: **No**.
- Later waves do not stall permanently: **Not testable**.
- All runnable packets complete or visibly fail: **No**.
- Duplicate dependent jobs not created: **Not testable**.
- Result: **Not reached**.

### 7.6 Workspace materialization

- Generated workspace/output location exists: **No fresh generated workspace created**.
- Real generated files exist: **No**.
- Generated file count > 0: **No**.
- Files are not placeholder/demo-only output: **Not testable**.
- Generated file paths: none.
- Result: **Not reached**.

### 7.7 Preview/output readiness

- Preview/output state becomes available if supported: **No**.
- Exact blocker: API cannot start because `ANTHROPIC_API_KEY` is missing; no project/runtime output exists.

### 7.8 Validation/evidence

- Repo baseline validators ran: **Yes**, `npm run validate:all` passed 78/78.
- Relevant validators against generated output: **No**, because no fresh generated output exists.
- Evidence artifacts written during this run: **Yes**, this report and its JSON companion.
- Evidence references fresh project ID: **No**, because no project ID could be created.
- Evidence stale: **No**, these two files were generated in this run, but they are blocker evidence rather than build-success evidence.

### 7.9 Failure visibility

- Safe failure path tested: **Startup failure path only**.
- Visible failure location: terminal output from `timeout 8s npm run api:start`.
- Exact visible failure: `{"event":"startup_env_error","missing":["ANTHROPIC_API_KEY"]}`.
- Job status/graph/log failure visibility: **Not testable**, because no job could be created.

### 7.10 Restart/resume

- Durable mode available: **No**.
- Restart/resume tested: **No**.
- Exact reason: missing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; durable repository and Supabase queue could not be used.

## 8. Generated files summary

- Generated workspace file count: `0`.
- Generated workspace file paths: none.
- I did **not** count static fixtures, prior `release-evidence`, seeded generated-app corpus files, or mock executor output as proof.

## 9. Validator/evidence summary

- Baseline repository validation passed: `npm run validate:all` reported **78 executed / 78 passed / 0 failed**.
- Generated-output validation did not run because no fresh output exists.
- Evidence artifacts from this run:
  - `BOTOMATIC_FULL_BUILD_PROOF.md`
  - `botomatic-full-build-proof.json`

## 10. Failure visibility result

The startup failure was visible and explicit. This is useful operational evidence, but it is **not** full build-path proof. No queue job failure path could be safely exercised because project intake and job creation were blocked before runtime.

## 11. Restart/resume result

Restart/resume was **untested**. Durable mode is unavailable because Supabase credentials are missing. Memory mode would not prove restart/resume durability because the in-memory project store is process-local.

## 12. Gaps found

### P0 blockers

1. **Executor unavailable / Anthropic key missing.** `ANTHROPIC_API_KEY` is required by bootstrap and is absent.
2. **API startup blocked.** The API exits before route registration, so intake cannot run.
3. **Durable storage unavailable.** Supabase URL/service-role key are missing; durable repository and queue proof cannot run.
4. **Auth unavailable.** No bearer token or OIDC config is present for protected commercial/reviewer/admin route proof.
5. **No fresh project ID.** Because intake could not run, every downstream build-path claim remains unproven.

### P1 proof gaps once P0 is fixed

1. Prove real executor output, not mock sidecar output.
2. Prove persisted plan-before-enqueue ordering.
3. Prove queue de-duplication for root and dependent jobs.
4. Prove worker claim/finalize state transitions.
5. Prove wave/dependency progression to completion or visible failure.
6. Prove generated workspace contains real AtlasCRM app files matching the prompt.
7. Prove preview/runtime availability or record exact environment blocker.
8. Prove validators and evidence reference the fresh project ID.
9. Prove durable restart/resume using Supabase mode.

## 13. Recommended remediation order

1. Provide real `ANTHROPIC_API_KEY` and configure the real executor path; do not rely on the mock executor or sidecar as production proof.
2. Provide `API_AUTH_TOKEN` for local proof or OIDC issuer/client/audience for auth proof.
3. Provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; set `PROJECT_REPOSITORY_MODE=durable` and `QUEUE_BACKEND=supabase` for durable queue proof.
4. Rerun `npm run api:start` and verify `/api/health` reports expected repository/auth/executor posture.
5. Create a fresh AtlasCRM project through the intake route.
6. Run compile, plan, enqueue, worker execution, wave progression, workspace materialization, preview, generated-output validators, failure-path proof, and durable restart/resume against that fresh project ID.
7. Only after the above succeeds, update this proof from `blocked` to `passed` with score 100.

## Final required printout

- Proof status: `blocked`
- Score: `0/100`
- Project ID used: none; project creation was blocked before intake
- Generated file count: `0`
- Evidence artifact count: `2`
- P0 failures:
  - Missing `ANTHROPIC_API_KEY` blocks API startup and real executor proof.
  - Missing Supabase credentials block durable storage/queue and restart-resume proof.
  - Missing auth configuration blocks protected route proof.
  - No fresh project could be created; downstream build proof remains unproven.
- Report file paths:
  - `BOTOMATIC_FULL_BUILD_PROOF.md`
  - `botomatic-full-build-proof.json`
- Next step is core orchestration remediation: **yes**. Environment/executor/durable/auth prerequisites must be remediated before rerunning full build proof.

## 14. GitHub Actions secret wiring update

After the local proof report above was produced, the repository gained a dedicated GitHub Actions workflow named **Full Build Path Proof**. That workflow maps repository secrets safely as `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}` and `OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}` at the job environment level and includes a preflight step that prints only `ANTHROPIC_API_KEY present: yes|no` and `OPENAI_API_KEY present: yes|no`; it never echoes either secret value.

This distinction matters:

- **Local Codex shell:** still cannot read GitHub repository secrets, so local proof remains blocked unless the environment explicitly provides `ANTHROPIC_API_KEY`.
- **GitHub Actions:** can run the proof workflow with the repository secret mapped into server-side job environment variables. The keys are not hardcoded, not committed, and not exposed through `NEXT_PUBLIC_*` client-side variables.

The workflow proof command is a server-side GitHub Actions shell command labeled `Full build-path proof command: API startup + AtlasCRM intake/compile/plan smoke`. It runs `npm run -s build`, `npm run -s test`, `npm run -s validate:all`, starts the API with the mapped secret, creates a fresh AtlasCRM project through `/api/projects/intake`, runs compile and plan, and fails visibly if the API, plan, or persisted packet checks fail. This wiring removes the previous GitHub Actions secret-mapping gap but does not convert this local report into a passed proof; live workflow results must still be reviewed without faking success.
