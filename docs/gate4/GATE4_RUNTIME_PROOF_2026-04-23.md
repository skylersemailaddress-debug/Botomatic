# Gate 4 Runtime Proof - 2026-04-23

Status: Closed by proof (local runtime)
Scope: Issues 20, 21, 22
Runtime: modern API runtime via apps/orchestrator-api/src/bootstrap.ts and apps/orchestrator-api/src/server_app.ts

## Environment

- OIDC mock issuer: http://127.0.0.1:4010
- API: http://127.0.0.1:3001
- Auth mode: OIDC
- Repository mode: memory

## Commands executed

1. Start OIDC mock issuer:

```bash
node /tmp/botomatic_oidc_mock.js
```

2. Start API runtime:

```bash
PORT=3001 RUNTIME_MODE=development PROJECT_REPOSITORY_MODE=memory OIDC_ISSUER_URL=http://127.0.0.1:4010 OIDC_CLIENT_ID=botomatic-local OIDC_AUDIENCE=botomatic-local-aud npm run -s api:start
```

3. Run proof sequence:

```bash
/tmp/run_gate4_proof.sh
```

## Raw API proof results

### 1) Replay blocked before captured+approved

- Request: POST /api/projects/:id/repair/replay (admin)
- Response:

```json
{"error":"Cannot replay: governance requirements not satisfied","issues":["Replay requires runtime proof to be captured.","Replay requires governance approval."],"governanceApprovalStatus":"pending","runtimeProofStatus":"required"}
```

- HTTP: 409
- Result: PASS

### 2) Promote blocked before captured+approved

- Request: POST /api/projects/:id/deploy/promote (admin)
- Response:

```json
{"error":"Cannot promote: governance requirements not satisfied","issues":["Promotion requires runtime proof to be captured.","Promotion requires governance approval."],"governanceApprovalStatus":"pending","runtimeProofStatus":"required"}
```

- HTTP: 409
- Result: PASS

### 3) Governance rejects approved without captured

- Request: POST /api/projects/:id/governance/approval with {"approvalStatus":"approved"}
- Response:

```json
{"error":"Cannot approve governance until runtime proof is captured","governanceApproval":{"modelVersion":"gate4-minimal-v1","approvalStatus":"approved","runtimeProofRequired":true,"runtimeProofStatus":"required","updatedAt":"2026-04-23T22:54:25.080Z","updatedBy":"admin-user"}}
```

- HTTP: 409
- Result: PASS

### 4) Governance accepts captured+approved from admin

- Request: POST /api/projects/:id/governance/approval with {"runtimeProofStatus":"captured","approvalStatus":"approved"}
- Response:

```json
{"success":true,"governanceApproval":{"modelVersion":"gate4-minimal-v1","approvalStatus":"approved","runtimeProofRequired":true,"runtimeProofStatus":"captured","updatedAt":"2026-04-23T22:54:25.089Z","updatedBy":"admin-user"},"actorId":"admin-user"}
```

- HTTP: 200
- Result: PASS

### 5) Guard behavior truthful after captured+approved

- Replay request response:

```json
{"error":"No repairable packets","actorId":"admin-user"}
```

- Replay HTTP: 409 (governance no longer blocks; domain condition is truthful)

- Promote request response:

```json
{"error":"Cannot promote: gate not ready","issues":["Validation has not run."]}
```

- Promote HTTP: 409 (governance no longer blocks; gate condition is truthful)
- Result: PASS

### 6) Audit records governance transition

- Request: GET /api/projects/:id/ui/audit (reviewer)
- Response contains event:

```json
{"type":"governance_approval_updated","actorId":"admin-user","metadata":{"approvalStatus":"approved","runtimeProofStatus":"captured"}}
```

- HTTP: 200
- Result: PASS

### 7) Role enforcement remains truthful

- Operator denied dangerous route:

```json
{"error":"Forbidden","requiredRole":"reviewer","actualRole":"operator"}
```

- HTTP: 403

- Reviewer denied admin-only route:

```json
{"error":"Forbidden","requiredRole":"admin","actualRole":"reviewer"}
```

- HTTP: 403

- Admin allowed admin route:

```json
{"success":true,"governanceApproval":{"approvalStatus":"approved","runtimeProofStatus":"captured"},"actorId":"admin-user"}
```

- HTTP: 200
- Result: PASS

## Gate 4 closure decision

Gate 4 is closed by runtime proof in this environment.
