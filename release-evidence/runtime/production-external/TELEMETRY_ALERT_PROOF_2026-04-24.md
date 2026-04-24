# Telemetry / Alert Production Proof

Date: 2026-04-24

## Result

PARTIAL PASS.

- Telemetry and correlation checks: PASS
- Route error capture in ops evidence: PASS
- External alert / notification sink proof: BLOCKED

This artifact does not claim enterprise readiness.

## Environment

- API: `http://127.0.0.1:3004`
- Runtime mode: `commercial`
- Repository mode: `durable`
- Auth implementation: `oidc`
- Temporary OIDC issuer for proof harness: `http://127.0.0.1:4012`
- Audience: `botomatic-telemetry-aud`

Reason for local issuer: no live external alert sink or external observability credentials were exposed in this shell environment. The proof below still exercises Botomatic's real HTTP telemetry paths and real durable runtime.

## Command summary

1. Start a temporary JWKS issuer and mint reviewer/admin proof tokens.
2. Start Botomatic in commercial durable OIDC mode:

```bash
PORT=3004 \
RUNTIME_MODE=commercial \
PROJECT_REPOSITORY_MODE=durable \
OIDC_ISSUER_URL=http://127.0.0.1:4012 \
OIDC_CLIENT_ID=botomatic-telemetry-client \
OIDC_AUDIENCE=botomatic-telemetry-aud \
npx tsx apps/orchestrator-api/src/bootstrap.ts
```

3. Execute proof requests:

- `GET /api/health` with explicit `x-request-id: telemetry-proof-health`
- `GET /api/ops/metrics`
- `GET /api/ops/queue`
- `GET /api/ops/errors`
- Trigger a real Botomatic route error via `POST /api/projects/intake` with a missing `request` field, which caused a durable repository insert failure and entered the `route_error` stream
- Re-read `GET /api/ops/metrics` and `GET /api/ops/errors`

## Raw response excerpts

### 1. `/api/health` returns request ID / correlation evidence

Request summary:

- Method: `GET`
- Route: `/api/health`
- Role: reviewer
- Sent header: `x-request-id: telemetry-proof-health`

Response:

- HTTP: `200`
- Response header `x-request-id`: `telemetry-proof-health`

```json
{
  "status": "ok",
  "runtimeMode": "commercial",
  "repositoryMode": "durable",
  "authImplementation": "oidc",
  "role": "reviewer",
  "userId": "telemetry-reviewer",
  "issuer": "http://127.0.0.1:4012",
  "requestId": "telemetry-proof-health"
}
```

Result: PASS

### 2. `/api/ops/metrics` returns live metrics

Response:

- HTTP: `200`

```json
{
  "queueDepth": 0,
  "activeWorkers": 0,
  "workerConcurrency": 2,
  "packetSuccessCount": 0,
  "packetFailureCount": 0,
  "validationPassCount": 0,
  "validationFailCount": 0,
  "promotionCount": 0,
  "routeErrorCount": 0,
  "repositoryMode": "durable",
  "requestId": "telemetry-proof-metrics-before"
}
```

Result: PASS

### 3. `/api/ops/queue` returns queue state

Response:

- HTTP: `200`

```json
{
  "queueDepth": 0,
  "activeWorkers": 0,
  "workerConcurrency": 2,
  "leaseMs": 30000,
  "workerId": "worker_7idkpg",
  "queueMode": "dedicated_jobs_table_parallel",
  "repositoryMode": "durable",
  "requestId": "telemetry-proof-queue"
}
```

Result: PASS

### 4. `/api/ops/errors` returns error state

Initial response before fault injection:

- HTTP: `200`

```json
{
  "errors": [],
  "count": 0,
  "actorId": "telemetry-reviewer",
  "requestId": "telemetry-proof-errors-before"
}
```

Result: PASS

### 5. A route error can be triggered and appears in ops/errors evidence

Fault injection request summary:

- Method: `POST`
- Route: `/api/projects/intake`
- Role: operator
- Sent header: `x-request-id: telemetry-proof-bad-intake`
- Body: `{ "name": "Broken Telemetry Proof Project" }`

Observed Botomatic response:

- HTTP: `500`

```json
{
  "error": "Durable repository insert failed 400: {\"code\":\"23502\",\"message\":\"null value in column \\\"request\\\" of relation \\\"orchestrator_projects\\\" violates not-null constraint\"}",
  "workerId": "worker_7idkpg",
  "requestId": "telemetry-proof-bad-intake"
}
```

Follow-up metrics response:

- HTTP: `200`
- `routeErrorCount`: `1`

```json
{
  "routeErrorCount": 1,
  "repositoryMode": "durable",
  "requestId": "telemetry-proof-metrics-after-2"
}
```

Follow-up ops errors response:

- HTTP: `200`

```json
{
  "count": 1,
  "errors": [
    {
      "type": "route_error",
      "metadata": {
        "route": "POST /api/projects/intake",
        "actorId": "telemetry-operator",
        "requestId": "telemetry-proof-bad-intake",
        "workerId": "worker_7idkpg"
      }
    }
  ],
  "requestId": "telemetry-proof-errors-after-2"
}
```

Result: PASS

### 6. External alert / notification path

Status: BLOCKED

Findings:

- No external alert sink is wired in `apps/orchestrator-api/src/config.ts`
- No alert delivery path or sink integration was found in `apps/orchestrator-api/src/server_app.ts`
- No configured environment variable for alert delivery exists in the runtime config or repository search results

Exact missing sink blocker:

- There is no implemented external alert sink variable at all. No variable such as `ALERT_WEBHOOK_URL`, `BOTOMATIC_ALERT_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `PAGERDUTY_ROUTING_KEY`, or equivalent exists in the current Botomatic runtime configuration.

Alert path classification:

- Real external alert path: NOT PROVEN
- External sink available in this environment: NO
- Enterprise readiness impact: remains blocked

Result: BLOCKED

## Summary table

| Check | Result |
|---|---|
| `/api/health` returns request ID / correlation evidence | PASS |
| `/api/ops/metrics` returns live metrics | PASS |
| `/api/ops/queue` returns queue state | PASS |
| `/api/ops/errors` returns error state | PASS |
| Route error can be triggered and appears in ops evidence | PASS |
| External alert / notification path proven | BLOCKED |

Overall status: PARTIAL PASS, with enterprise-readiness blocker remaining.

## Remaining blocker from this proof

- No implemented external alert sink variable or delivery integration exists, so production telemetry proof remains incomplete for alerts / notifications.

## Caveats

- `manifest.json`, `proof_profile.json`, and `LAUNCH_BLOCKERS.md` were intentionally not edited.
- This artifact proves telemetry endpoints and route-error capture on the real Botomatic durable runtime, but it does not prove traces, SLO enforcement, or external alert delivery.
- Enterprise readiness remains blocked.