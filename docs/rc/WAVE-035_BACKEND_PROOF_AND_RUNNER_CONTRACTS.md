# WAVE-035 — Backend Proof + Runner Contract Plan

This wave is specification-only. It does not enable launch/deploy controls, does not remove truthful fallbacks, and does not claim release readiness.

## 1) Execution runner API contract

### Endpoints
- `GET /api/projects/:projectId/execution`
- `GET /api/projects/:projectId/execution/:runId`
- `POST /api/projects/:projectId/execution`
- `POST /api/projects/:projectId/jobs`

### Request/response
- `POST /execution` body:
  - `prompt: string`
  - `objective?: string`
  - `idempotencyKey: string`
  - `requestedJobs?: JobType[]`
- `POST /jobs` body:
  - `runId: string`
  - `jobType: "test" | "build" | "file_diff" | "lint" | "typecheck"`
  - `idempotencyKey: string`
- Responses include `runId`, `projectId`, `status`, `createdAt`, `updatedAt`, `jobs[]`, `receipts[]`, `errors[]`.

### Status transitions
`queued -> running -> succeeded | failed | cancelled`.

### Error shape
```json
{ "error": { "code": "string", "message": "string", "retryable": false, "details": {} } }
```

### Idempotency/security/logging/evidence
- Idempotent by `(projectId, idempotencyKey, endpoint)`.
- no arbitrary shell from user prompt.
- allowlisted job types.
- project-scoped execution only.
- Auth required for all execution routes.
- Logs must include run/job correlation IDs and timestamps.
- Receipts must include command allowlist entry, exit code, artifact references, checksum, and redaction status.

## 2) Runtime API contract

### Endpoints
- `GET /api/projects/:projectId/runtime`
- `POST /api/projects/:projectId/runtime/start`
- `POST /api/projects/:projectId/runtime/stop`
- `GET /api/projects/:projectId/runtime/logs`

### Contract requirements
- Runtime payload contains:
  - `state: stopped | starting | running | stopping | errored`
  - `verifiedPreviewUrl?: string`
  - `derivedPreviewUrl?: string`
  - `proof: { healthcheckUrl, healthcheckStatus, verifiedAt, verifier, receiptId }`
- preview alone does not unlock launch.
- derived preview URL not sufficient as proof.
- Start/stop state machine:
  - `stopped -> starting -> running`
  - `running -> stopping -> stopped`
  - any state can move to `errored` on verified failure.
- Logs shape: `{ stream, ts, level, message, redacted, source, runId? }[]`.
- logs must not leak secrets.

## 3) Launch proof contract

### Endpoints/state
- `GET /api/projects/:projectId/launch-proof`
- `POST /api/projects/:projectId/launch/verify`
- Project state fields: `launchProof`, `launchReady`, `releaseEvidence.launchReady`.

### Launch proof structure
- `launchProof`: `{ verified: boolean, verifiedAt, verifier, runtimeReceiptId, testReceiptId, buildReceiptId, artifactManifestPath, notes }`
- `launchReady = true` only when launch proof verified and required receipts are present.
- `releaseEvidence.launchReady` mirrors persisted proof snapshot and checksum.
- `firstRun.canLaunch` becomes true only from verified launch proof, never from preview rendering alone.

## 4) Deploy/rollback contract

### Endpoints
- `POST /api/projects/:projectId/deploy`
- `GET /api/projects/:projectId/deployments`
- `POST /api/projects/:projectId/rollback`

### Preconditions and proof
- Deploy requires explicit proof: `launchReady=true`, verified receipts, authenticated actor, target configuration.
- Rollback requires deployment record with `deploymentId` and rollback target.
- Deployment response must include receipt, deployment record, and audit trail reference.
- Failures return structured error with rollback recommendation and retained evidence.
- UI gating remains disabled until proof fields are complete and verified.

## 5) Test/build/file-change proof contract
Execution jobs must emit:
- `testSummary`: totals, passed, failed, skipped, duration.
- `buildSummary`: status, output target, duration, warnings count.
- `fileDiffSummary`: filesChanged, additions, deletions, touchedPaths.
- `artifactPaths`: machine-readable file paths for logs/results/manifests.
- `logs`: timestamped and redacted stream.
- `receipts`: signed metadata of execution context.
- `failureRecords`: normalized failures with remediation hints.

## 6) Persistence model
Persist per project:
- `objective`
- `nextStep`
- `latestPrompt`
- `activeRunId`
- `latestRunId`
- `executionRun` (status + jobs + receipts)
- `runtime` (state + verified preview + logs index)
- `launchProof`
- `deploymentRecords`
- `releaseEvidence` / receipts and evidence pointers

Durability target: append-only evidence ledger + mutable project snapshot.

## 7) Final route map

| Route | Method | Exists now | Consumer service | Required | Acceptance criteria |
|---|---|---|---|---|---|
| `/api/projects/:projectId/execution` | GET | unknown | `execution.ts` | WAVE-036 | Lists runs with status + receipts |
| `/api/projects/:projectId/execution/:runId` | GET | unknown | `execution.ts` | WAVE-036 | Returns run detail and jobs |
| `/api/projects/:projectId/execution` | POST | unknown | `execution.ts`, `firstRun.ts` | WAVE-036 | Creates run with idempotency |
| `/api/projects/:projectId/jobs` | POST | unknown | `execution.ts` | WAVE-036 | Enqueues allowlisted job only |
| `/api/projects/:projectId/runtime` | GET | unknown | `runtimeStatus.ts` | WAVE-037 | Returns verified runtime state |
| `/api/projects/:projectId/runtime/start` | POST | unknown | `runtimeStatus.ts` | WAVE-037 | Valid start transition with receipt |
| `/api/projects/:projectId/runtime/stop` | POST | unknown | `runtimeStatus.ts` | WAVE-037 | Valid stop transition with receipt |
| `/api/projects/:projectId/runtime/logs` | GET | unknown | `runtimePreview.ts` | WAVE-037 | Redacted logs and pagination cursor |
| `/api/projects/:projectId/launch-proof` | GET | unknown | `firstRun.ts`, `proDashboard.ts` | WAVE-038 | Returns proof + `launchReady` |
| `/api/projects/:projectId/launch/verify` | POST | unknown | `firstRun.ts` | WAVE-038 | Verifies required receipts |
| `/api/projects/:projectId/deploy` | POST | unknown | `proDashboard.ts` | WAVE-038 | Rejects without verified proof |
| `/api/projects/:projectId/deployments` | GET | unknown | `proDashboard.ts` | WAVE-038 | Lists deployment/rollback history |
| `/api/projects/:projectId/rollback` | POST | unknown | `proDashboard.ts` | WAVE-038 | Requires deployment record |

## 8) Security constraints
- no arbitrary shell from user prompt.
- allowlisted job types.
- project-scoped execution only.
- auth required.
- token handling: server-only secrets, short-lived scoped credentials, encrypted at rest.
- no NEXT_PUBLIC secret leakage.
- deploy requires explicit proof.
- rollback requires deployment record.
- logs must not leak secrets.

## 9) Next wave plan
- **WAVE-036 — Runner API Implementation**: implement execution/job endpoints with idempotency + receipts.
- **WAVE-037 — Runtime Control Implementation**: runtime state machine, start/stop, logs, verified preview proof.
- **WAVE-038 — Launch Proof + Deploy Gating**: launch verification + deploy/rollback gating contracts.
- **WAVE-039 — End-to-End Browser Acceptance**: browser-driven acceptance over truthful UI with real backend responses.
- **WAVE-040 — Public Beta Release Gate**: final release gate based on accumulated evidence and negative-path proofs.
