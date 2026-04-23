# Gate 6 Runtime Proof - 2026-04-23

Status: Closed by proof (local durable runtime)
Scope: Gate 6 (observability and auditability)
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

2. Run Gate 6 proof sequence:

```bash
/tmp/run_gate6_proof.sh
```

## Runtime checks and outcomes

### 1) Operators can see what happened

- Reviewer health and overview endpoints returned live runtime and run-stage details.
- Example overview output included status, stage, activity, and blockers.
- Result: PASS

### 2) Failures are diagnosable from product surface

- Promote blocked diagnostic response:

```json
{"error":"Cannot promote: governance requirements not satisfied","issues":["Promotion requires runtime proof to be captured.","Promotion requires governance approval."]}
```

- Overview blockers provided direct diagnosis:

```json
{"blockers":["Validation has not run."]}
```

- Result: PASS

### 3) Actor/source attribution is visible

- Audit stream included actor identities and roles:

```json
{"type":"governance_approval_updated","actorId":"admin-g6","role":"admin"}
{"type":"plan","actorId":"op-g6"}
```

- Health and gate payloads included reviewer identity and issuer context.
- Result: PASS

### 4) Packet/run history is usable

- Packets endpoint exposed packet IDs, branch names, goals, and statuses.
- Audit timeline exposed ordered transition events for intake, compile, plan, and governance update.
- Result: PASS

### 5) Artifact and state transitions are understandable

- Artifacts endpoint returned operation artifacts list (empty at this early point, but shape and access path were valid).
- Gate endpoint reflected launch status, approval status, governance state, and issues.
- Deployments endpoint exposed environment state per target.
- Result: PASS

## Key raw responses

### Blocked promote diagnosis

```json
{"error":"Cannot promote: governance requirements not satisfied","issues":["Promotion requires runtime proof to be captured.","Promotion requires governance approval."],"governanceApprovalStatus":"pending","runtimeProofStatus":"required"}
```

### Gate snapshot with attribution

```json
{"launchStatus":"blocked","approvalStatus":"approved","governanceApproval":{"approvalStatus":"approved","runtimeProofStatus":"captured"},"issues":["Validation has not run."],"role":"reviewer","userId":"reviewer-g6","issuer":"http://127.0.0.1:4010"}
```

### Audit sample

```json
{"type":"governance_approval_updated","actorId":"admin-g6","role":"admin","metadata":{"approvalStatus":"approved","runtimeProofStatus":"captured"}}
{"type":"compile","actorId":"op-g6"}
{"type":"plan","actorId":"op-g6"}
```

## Gate 6 closure decision

Gate 6 is closed by runtime proof in this environment.
