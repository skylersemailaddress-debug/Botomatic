# Durable Deploy / Rollback / Restart Proof

Date: 2026-04-24
Project ID: proj_1777001926717
Result: **PASS**

---

## Environment

- API: http://localhost:3001
- Repository mode: durable
- Repository implementation: DurableProjectRepository
- Auth implementation: oidc
- OIDC issuer: https://dev-7fq48efb26j44svb.us.auth0.com/
- OIDC audience: https://botomatic.local/api
- Auth0 actor: wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients (client-credentials M2M)
- Role: admin

---

## 1. API Start Command

```bash
PORT=3001 RUNTIME_MODE=commercial PROJECT_REPOSITORY_MODE=durable \
  OIDC_ISSUER_URL="https://dev-7fq48efb26j44svb.us.auth0.com/" \
  OIDC_CLIENT_ID="wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp" \
  OIDC_AUDIENCE="https://botomatic.local/api" \
  SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
  npm run -s api:start
```

Boot log:

```json
{"event":"api_boot","appName":"botomatic-orchestrator-api","runtimeMode":"commercial","repositoryMode":"durable","repositoryImplementation":"DurableProjectRepository","authEnabled":true,"authImplementation":"oidc","durableEnvPresent":true,"commitSha":null,"startupTimestamp":"2026-04-24T18:32:42.875Z"}
```

---

## 2. Auth0 Token Acquisition

```bash
curl -s --request POST \
  --url "https://dev-7fq48efb26j44svb.us.auth0.com/oauth/token" \
  --header "content-type: application/json" \
  --data '{"client_id":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp","client_secret":"...","audience":"https://botomatic.local/api","grant_type":"client_credentials"}'
```

Response: access_token (RS256 JWT) acquired. Token payload:

- iss: https://dev-7fq48efb26j44svb.us.auth0.com/
- aud: https://botomatic.local/api
- https://botomatic.dev/role: admin
- gty: client-credentials

---

## 3. Durable Mode + OIDC Health Proof

```bash
GET /api/health
Authorization: Bearer <auth0-token>
```

Response (HTTP 200):

```json
{
  "status": "ok",
  "appName": "botomatic-orchestrator-api",
  "runtimeMode": "commercial",
  "repositoryMode": "durable",
  "repositoryImplementation": "DurableProjectRepository",
  "durableEnvPresent": true,
  "authEnabled": true,
  "authImplementation": "oidc",
  "startupTimestamp": "2026-04-24T18:32:42.875Z",
  "role": "admin",
  "userId": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients",
  "issuer": "https://dev-7fq48efb26j44svb.us.auth0.com/",
  "requestId": "req_1777055596831_8myqf7"
}
```

**PASS**: durable mode, OIDC auth, admin role all confirmed.

---

## 4. Blocked Promote Before Validation (Prior Session)

From prior session (before packet execution this session):

```bash
POST /api/projects/proj_1777001926717/deploy/promote
Body: {"environment":"staging"}
```

Response (HTTP 409):

```json
{"error":"Cannot promote: gate not ready","issues":["Validation has not run."]}
```

**PASS**: promote correctly blocked before validation ran.

---

## 5. Blocked Rollback Before Promote (Prior Session)

From prior session:

```bash
POST /api/projects/proj_1777001926717/deploy/rollback
Body: {"environment":"staging"}
```

Response (HTTP 409):

```json
{"error":"Cannot rollback: environment has not been promoted"}
```

**PASS**: rollback correctly blocked before promote.

---

## 6. Packet Execution to Trigger Validation

Called `POST /api/projects/proj_1777001926717/dispatch/execute-next` repeatedly.

Execution responses (HTTP 202 for each):

```json
{"accepted":true,"queued":true,"jobId":"job_1777055636049_t5ad48","packetId":"proj_1777001926717-m1-p1","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","workerId":"worker_c4i8l0"}
{"accepted":true,"queued":true,"jobId":"job_1777055638177_h0ez3v","packetId":"proj_1777001926717-m2-p2","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","workerId":"worker_c4i8l0"}
{"accepted":true,"queued":true,"jobId":"job_1777055722189_wiw9m5","packetId":"proj_1777001926717-m4-p4","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","workerId":"worker_c4i8l0"}
```

Final `No pending packet` response confirmed all packets queued.

Packet status after execution:

```json
{
  "packets": [
    {"packetId":"proj_1777001926717-m1-p1","status":"executing","goal":"Scaffold + Repo Setup"},
    {"packetId":"proj_1777001926717-m2-p2","status":"complete","goal":"Auth + App Shell"},
    {"packetId":"proj_1777001926717-m3-p3","status":"complete","goal":"Core Data Model"},
    {"packetId":"proj_1777001926717-m4-p4","status":"executing","goal":"Core Workflow Pages"},
    {"packetId":"proj_1777001926717-m5-p5","status":"complete","goal":"Validation + Preview"}
  ]
}
```

---

## 7. Gate Ready After Validation

```bash
GET /api/projects/proj_1777001926717/ui/gate
```

Response:

```json
{
  "launchStatus": "ready",
  "approvalStatus": "approved",
  "governanceApproval": {
    "approvalStatus": "approved",
    "runtimeProofStatus": "captured",
    "runtimeProofRequired": true,
    "updatedAt": "2026-04-24T03:40:21.095Z",
    "updatedBy": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients"
  },
  "issues": [],
  "role": "admin",
  "issuer": "https://dev-7fq48efb26j44svb.us.auth0.com/"
}
```

**PASS**: `launchStatus: ready`, `issues: []`. Validation ran successfully via packet execution path.

---

## 8. Successful Promote

```bash
POST /api/projects/proj_1777001926717/deploy/promote
Body: {"environment":"staging"}
```

Response (HTTP 200):

```json
{
  "success": true,
  "environment": "staging",
  "governanceApprovalStatus": "approved",
  "actorId": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients"
}
```

**PASS**.

---

## 9. Successful Rollback

```bash
POST /api/projects/proj_1777001926717/deploy/rollback
Body: {"environment":"staging"}
```

Response (HTTP 200):

```json
{
  "success": true,
  "environment": "staging",
  "status": "rolled_back",
  "actorId": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients"
}
```

**PASS**.

---

## 10. Before-Restart State

### Deployments

```json
{
  "deployments": {
    "dev": {"status": "idle", "environment": "dev"},
    "prod": {"status": "idle", "environment": "prod"},
    "staging": {
      "status": "rolled_back",
      "promotedAt": "2026-04-24T18:41:11.065Z",
      "promotedBy": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients",
      "rollbackAt": "2026-04-24T18:41:15.805Z",
      "rollbackBy": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients",
      "environment": "staging"
    }
  }
}
```

### Most Recent Audit Events (before restart)

```json
[
  {"id":"evt_1777056075805","role":"admin","type":"rollback","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","metadata":{"environment":"staging"},"timestamp":"2026-04-24T18:41:15.805Z"},
  {"id":"evt_1777056071065","role":"admin","type":"promote","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","metadata":{"environment":"staging"},"timestamp":"2026-04-24T18:41:11.065Z"},
  {"id":"evt_1777055729087","role":"system","type":"validation","actorId":"worker_c4i8l0","metadata":{"packetId":"proj_1777001926717-m5-p5"},"timestamp":"2026-04-24T18:35:29.087Z"}
]
```

---

## 11. API Restart

Killed all API processes (PIDs 7593, 7607, 7608, 7624).

Restarted with identical env (durable + OIDC):

```bash
PORT=3001 RUNTIME_MODE=commercial PROJECT_REPOSITORY_MODE=durable \
  OIDC_ISSUER_URL="https://dev-7fq48efb26j44svb.us.auth0.com/" \
  OIDC_CLIENT_ID="wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp" \
  OIDC_AUDIENCE="https://botomatic.local/api" \
  SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
  npm run -s api:start
```

New `startupTimestamp`: `2026-04-24T18:42:13.988Z` (differs from original `2026-04-24T18:32:42.875Z`, confirming true restart).

New `workerId`: `worker_hs74ol` (differs from original `worker_c4i8l0`, confirming fresh process).

---

## 12. After-Restart State

### Deployments (after restart)

```json
{
  "deployments": {
    "dev": {"status": "idle", "environment": "dev"},
    "prod": {"status": "idle", "environment": "prod"},
    "staging": {
      "status": "rolled_back",
      "promotedAt": "2026-04-24T18:41:11.065Z",
      "promotedBy": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients",
      "rollbackAt": "2026-04-24T18:41:15.805Z",
      "rollbackBy": "wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients",
      "environment": "staging"
    }
  }
}
```

**IDENTICAL to before-restart.** Deployment state persisted through restart via Supabase durable repository.

### Most Recent Audit Events (after restart)

```json
[
  {"id":"evt_1777056075805","role":"admin","type":"rollback","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","metadata":{"environment":"staging"},"timestamp":"2026-04-24T18:41:15.805Z"},
  {"id":"evt_1777056071065","role":"admin","type":"promote","actorId":"wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp@clients","metadata":{"environment":"staging"},"timestamp":"2026-04-24T18:41:11.065Z"},
  {"id":"evt_1777055729087","role":"system","type":"validation","actorId":"worker_c4i8l0","metadata":{"packetId":"proj_1777001926717-m5-p5"},"timestamp":"2026-04-24T18:35:29.087Z"}
]
```

**IDENTICAL to before-restart.** Audit log persisted through restart via Supabase durable repository.

---

## Summary of Checks

| Check | Result |
|---|---|
| API starts in durable mode | PASS |
| Auth0 OIDC admin token verified | PASS |
| Health shows repositoryMode: durable | PASS |
| Health shows authImplementation: oidc | PASS |
| Health shows role: admin | PASS |
| Promote blocked before validation | PASS (prior session 409) |
| Rollback blocked before promote | PASS (prior session 409) |
| Packets executed via dispatch/execute-next | PASS |
| Validation ran through execution path | PASS |
| Gate ready after validation | PASS (launchStatus: ready, issues: []) |
| Promote to staging succeeded | PASS |
| Rollback from staging succeeded | PASS |
| Deployment state persisted through restart | PASS |
| Audit log persisted through restart | PASS |

---

## Final Result: PASS
