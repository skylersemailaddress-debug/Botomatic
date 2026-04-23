# Observability Hardening Runtime Proof - 2026-04-23

Status: Implemented and runtime-validated (local runtime)
Scope: Phase 5 observability hardening
Runtime: modern API runtime via apps/orchestrator-api/src/bootstrap.ts and apps/orchestrator-api/src/server_app.ts

## Environment

- OIDC mock issuer: http://127.0.0.1:4010
- API: http://127.0.0.1:3002
- Auth mode: OIDC
- Repository mode: memory

## Commands executed

1. Start OIDC mock issuer:

```bash
node /tmp/botomatic_oidc_mock.js
```

2. Start API runtime:

```bash
PORT=3002 RUNTIME_MODE=development PROJECT_REPOSITORY_MODE=memory OIDC_ISSUER_URL=http://127.0.0.1:4010 OIDC_CLIENT_ID=botomatic-local OIDC_AUDIENCE=botomatic-local-aud npx tsx apps/orchestrator-api/src/bootstrap.ts
```

3. Run observability runtime validator:

```bash
BOTOMATIC_OBSERVABILITY_VALIDATE=1 BOTOMATIC_BASE_URL=http://127.0.0.1:3002 BOTOMATIC_OIDC_ISSUER=http://127.0.0.1:4010 BOTOMATIC_OIDC_AUDIENCE=botomatic-local-aud BOTOMATIC_OIDC_PRIVATE_KEY_PATH=/tmp/botomatic_oidc_private.pem npm run -s validate:observability
```

4. Run full validation:

```bash
npm run -s validate:all
```

## Runtime checks and outcomes

- ops_metrics_endpoint_live: PASS
- ops_queue_endpoint_live: PASS
- ops_errors_endpoint_live: PASS
- request_id_header_present: PASS

Result: PASS (4 passed, 0 failed, 0 skipped)

## Evidence artifacts

- release-evidence/runtime/ops_observability.json

## Implementation highlights

- Added authenticated `/api/ops/metrics`, `/api/ops/errors`, `/api/ops/queue` endpoints.
- Added `x-request-id` request/response correlation middleware.
- Added structured auth-failure and route-error capture into ops error stream.
- Added queue-depth stats integration for durable mode using job table counts.
- Added validator: `Validate-Botomatic-ObservabilityRuntimeEvidence`.

## Closure decision

Phase 5 observability hardening is complete for local-runtime proof level. Production-grade telemetry depth remains open and tracked in launch blockers.
