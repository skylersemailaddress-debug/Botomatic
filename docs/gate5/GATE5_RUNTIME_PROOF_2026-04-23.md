# Gate 5 Runtime Proof - 2026-04-23

Status: Closed by proof (local durable runtime)
Scope: Gate 5 (gate, deployment, rollback)
Runtime: modern API runtime via apps/orchestrator-api/src/bootstrap.ts and apps/orchestrator-api/src/server_app.ts

## Environment

- OIDC mock issuer: http://127.0.0.1:4010
- API: http://127.0.0.1:3001
- Auth mode: OIDC
- Repository mode: durable

## Commands executed

1. Start API in durable mode:

```bash
PORT=3001 RUNTIME_MODE=development PROJECT_REPOSITORY_MODE=durable OIDC_ISSUER_URL=http://127.0.0.1:4010 OIDC_CLIENT_ID=botomatic-local OIDC_AUDIENCE=botomatic-local-aud npx tsx apps/orchestrator-api/src/bootstrap.ts
```

2. Run proof sequence:

```bash
/tmp/run_gate5_proof.sh
```

3. Restart persistence check:

```bash
# restart API with same durable settings
curl -H "Authorization: Bearer <reviewer-token>" /api/projects/<projectId>/ui/deployments
```

## Raw API proof results

### 1) Promote blocked when governance/gate not ready

- Before governance capture/approval:

```json
{"error":"Cannot promote: governance requirements not satisfied","issues":["Promotion requires runtime proof to be captured.","Promotion requires governance approval."],"governanceApprovalStatus":"pending","runtimeProofStatus":"required"}
```

- HTTP: 409

- After governance capture/approval but before validation:

```json
{"error":"Cannot promote: gate not ready","issues":["Validation has not run."]}
```

- HTTP: 409
- Result: PASS

### 2) Promote succeeds when gate/governance ready

- Gate endpoint after execution:

```json
{"launchStatus":"ready","approvalStatus":"approved","issues":[]}
```

- Promote response:

```json
{"success":true,"environment":"staging","governanceApprovalStatus":"approved","actorId":"admin-g5"}
```

- HTTP: 200
- Result: PASS

### 3) Rollback route exists

- Request: POST /api/projects/:id/deploy/rollback
- Successful response observed:

```json
{"success":true,"environment":"staging","status":"rolled_back","actorId":"admin-g5"}
```

- HTTP: 200
- Result: PASS

### 4) Rollback changes deployment truthfully

- After promote:

```json
{"staging":{"status":"promoted","promotedBy":"admin-g5"}}
```

- After rollback:

```json
{"staging":{"status":"rolled_back","rollbackBy":"admin-g5"}}
```

- Result: PASS

### 5) Deployment state survives restart in durable mode

- Project: proj_1776985226518
- After API restart, deployments endpoint still shows:

```json
{"staging":{"status":"rolled_back","promotedAt":"2026-04-23T23:00:53.112Z","rollbackAt":"2026-04-23T23:00:53.435Z"}}
```

- HTTP: 200
- Result: PASS

### 6) UI endpoints reflect deployment truth

- GET /api/projects/:id/ui/deployments reflected promoted then rolled_back states.
- GET /api/projects/:id/ui/gate reflected blocked then ready transitions truthfully.
- Result: PASS

### 7) Audit captures promote and rollback

- GET /api/projects/:id/ui/audit contained both events:

```json
{"type":"promote","actorId":"admin-g5","metadata":{"environment":"staging"}}
{"type":"rollback","actorId":"admin-g5","metadata":{"environment":"staging"}}
```

- Result: PASS

## Gate 5 closure decision

Gate 5 is closed by runtime proof in this environment.
