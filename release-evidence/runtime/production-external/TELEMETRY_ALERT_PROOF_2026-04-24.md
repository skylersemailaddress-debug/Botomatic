# Telemetry and Alert Proof

Date: 2026-04-24

## Result

PASS (local capture webhook sink).

- Telemetry checks 1-5: PASS
- Alert delivery check 6: PASS using local capture webhook (not external SaaS)

This artifact does not set enterprise readiness.

## Sink type

- Alert sink mode: local capture webhook
- Configured env var: `BOTOMATIC_ALERT_WEBHOOK_URL=http://127.0.0.1:4020/alerts`
- External Slack/PagerDuty SaaS sink: not used in this run

## Command summary

1. Start local alert capture webhook at `http://127.0.0.1:4020/alerts` and write captures to `/tmp/botomatic_alert_capture.jsonl`.
2. Start temporary JWKS OIDC issuer at `http://127.0.0.1:4013` for runtime proof tokens.
3. Start modern runtime (`apps/orchestrator-api/src/server_app.ts`) in commercial durable mode with alert env var configured.

```bash
PORT=3005 \
RUNTIME_MODE=commercial \
PROJECT_REPOSITORY_MODE=durable \
OIDC_ISSUER_URL=http://127.0.0.1:4013 \
OIDC_CLIENT_ID=botomatic-alert-proof \
OIDC_AUDIENCE=botomatic-alert-proof-aud \
BOTOMATIC_ALERT_WEBHOOK_URL=http://127.0.0.1:4020/alerts \
npx tsx apps/orchestrator-api/src/bootstrap.ts
```

4. Run proof requests:

- `GET /api/health` with request ID header
- `GET /api/ops/metrics`
- `GET /api/ops/errors`
- trigger route error via `POST /api/projects/intake` with missing `request` field
- re-read `/api/ops/metrics` and `/api/ops/errors`
- read captured alert payload from local webhook log

## Raw response excerpts

### 1) Health correlation

- Route: `GET /api/health`
- Sent `x-request-id`: `alert-proof-health`
- HTTP: `200`
- Response header `x-request-id`: `alert-proof-health`

```json
{
  "runtimeMode": "commercial",
  "repositoryMode": "durable",
  "authImplementation": "oidc",
  "requestId": "alert-proof-health"
}
```

Result: PASS

### 2) Live metrics

- Route: `GET /api/ops/metrics`
- HTTP: `200`

```json
{
  "queueDepth": 0,
  "routeErrorCount": 0,
  "alertDeliverySuccessCount": 0,
  "alertDeliveryFailureCount": 0,
  "alertSinkConfigured": true,
  "requestId": "alert-proof-metrics-before"
}
```

Result: PASS

### 3) Queue state

- Route: `GET /api/ops/queue`
- HTTP: `200`

```json
{
  "queueDepth": 0,
  "activeWorkers": 0,
  "workerConcurrency": 2,
  "queueMode": "dedicated_jobs_table_parallel"
}
```

Result: PASS

### 4) Error state endpoint

- Route: `GET /api/ops/errors`
- HTTP: `200`

```json
{
  "errors": [],
  "count": 0,
  "requestId": "alert-proof-errors-before"
}
```

Result: PASS

### 5) Trigger route error and verify in ops/errors

Trigger request:

- Route: `POST /api/projects/intake`
- Sent `x-request-id`: `alert-proof-route-error`
- Body: `{ "name": "Alert Proof Missing Request Field" }`

Trigger response:

- HTTP: `500`

```json
{
  "error": "Durable repository insert failed 400: ... null value in column \"request\" ...",
  "requestId": "alert-proof-route-error"
}
```

Ops error evidence:

- Route: `GET /api/ops/errors`
- HTTP: `200`

```json
{
  "errors": [
    {
      "type": "route_error",
      "metadata": {
        "route": "POST /api/projects/intake",
        "requestId": "alert-proof-route-error",
        "runtimeMode": "commercial"
      }
    }
  ],
  "count": 1
}
```

Metrics after route error:

```json
{
  "routeErrorCount": 1,
  "alertDeliverySuccessCount": 1,
  "alertDeliveryFailureCount": 0,
  "alertSinkConfigured": true
}
```

Result: PASS

### 6) Alert payload captured by sink and correlated

Local webhook capture entry:

```json
{
  "method": "POST",
  "url": "/alerts",
  "body": {
    "event": "route_error",
    "category": "route_error",
    "route": "POST /api/projects/intake",
    "message": "Durable repository insert failed 400: ...",
    "requestId": "alert-proof-route-error",
    "timestamp": "2026-04-24T19:29:23.263Z",
    "runtimeMode": "commercial"
  }
}
```

Correlation check:

- `captured_alert.body.requestId == ops_errors.route_error.metadata.requestId`
- value: `alert-proof-route-error`

Result: PASS

## Validator output snapshot

Run: `npm run -s validate:all`

- PASS: `Validate-Botomatic-Observability` (now requires alert sink wiring)
- Summary: 16 passed / 1 failed
- Remaining failed validator: `Validate-Botomatic-FinalLaunchReadiness` (expected, enterprise claim still blocked)

## Pass/Fail summary

| Required check | Status |
|---|---|
| 1. `/api/health` correlation evidence | PASS |
| 2. `/api/ops/metrics` live metrics | PASS |
| 3. `/api/ops/queue` queue state | PASS |
| 4. `/api/ops/errors` error state | PASS |
| 5. Route error appears in ops evidence | PASS |
| 6. Alert path proven | PASS (local capture webhook) |

## Notes

- Request handling is non-blocking for alert delivery. Alert send failures increment `alertDeliveryFailureCount` and are recorded as `alert_delivery_failed` events in ops errors.
- This proof uses a local capture sink to prove payload emission and correlation semantics. It is not a third-party external SaaS notification proof.