# External Alert Delivery Proof

Date: 2026-04-24

## Result

FAIL.

The Botomatic API was restarted in commercial durable OIDC mode and the requested `route_error` was reproduced with `requestId=external-alert-proof-2026-04-24`. Botomatic `ops/errors` recorded the matching request ID. External Slack delivery could not be confirmed in this run because the real `BOTOMATIC_ALERT_WEBHOOK_URL` value existed only in the interactive terminal shell and was not recoverable from the Copilot execution shell without exposing or re-entering the secret.

## Requested external sink

- Sink type: Slack Incoming Webhook
- Secret URL: intentionally omitted
- Delivery proof status: not confirmed in this run

## Runtime configuration used

- API: `apps/orchestrator-api/src/bootstrap.ts`
- Port: `3001`
- Runtime mode: `commercial`
- Repository mode: `durable`
- Auth implementation: `oidc`
- OIDC issuer: `https://dev-7fq48efb26j44svb.us.auth0.com/`
- OIDC audience: `https://botomatic.local/api`

Boot confirmation excerpt:

```json
{
  "event": "api_boot",
  "appName": "botomatic-orchestrator-api",
  "runtimeMode": "commercial",
  "repositoryMode": "durable",
  "repositoryImplementation": "DurableProjectRepository",
  "authEnabled": true,
  "authImplementation": "oidc",
  "durableEnvPresent": true
}
```

## 1. Trigger route_error

- Route: `POST /api/projects/intake`
- Request ID: `external-alert-proof-2026-04-24`
- Body used to force durable insert failure: `{ "name": "External Alert Proof Missing Request Field" }`

Route response excerpt:

```json
{
  "error": "Durable repository insert failed 400: ... null value in column \"request\" of relation \"orchestrator_projects\" violates not-null constraint",
  "requestId": "external-alert-proof-2026-04-24",
  "workerId": "worker_02l0g3"
}
```

HTTP status: `500`

## 2. Confirm /api/ops/errors correlation

`GET /api/ops/errors` returned HTTP `200` and included the matching request ID.

Ops/errors excerpt:

```json
{
  "type": "route_error",
  "message": "Durable repository insert failed 400: ... null value in column \"request\" of relation \"orchestrator_projects\" violates not-null constraint",
  "metadata": {
    "route": "POST /api/projects/intake",
    "requestId": "external-alert-proof-2026-04-24",
    "runtimeMode": "commercial",
    "workerId": "worker_02l0g3"
  }
}
```

## 3. Slack delivery confirmation summary

Slack delivery could not be confirmed in the Botomatic workspace/channel during this run.

Observed alert metrics after the route error:

```json
{
  "routeErrorCount": 1,
  "alertDeliverySuccessCount": 0,
  "alertDeliveryFailureCount": 0,
  "alertSinkConfigured": false
}
```

Interpretation:

- The route error path executed and was recorded.
- No alert sink was configured in the restarted proof process.
- Because the external Slack Incoming Webhook secret was not recoverable in the Copilot execution shell, no external alert POST was attempted from this validated run.
- Slack workspace/channel receipt is therefore unverified.

## 4. Blocking condition for PASS

This proof can only move to PASS after rerunning the same commercial durable OIDC flow with the real external `BOTOMATIC_ALERT_WEBHOOK_URL` present in the API process environment and then confirming both:

1. `requestId=external-alert-proof-2026-04-24` (or a fresh run-specific request ID) appears in `POST /api/projects/intake` route error output and `GET /api/ops/errors`.
2. Slack Incoming Webhook delivery is confirmed for that same event in the Botomatic workspace/channel.

## Final status

FAIL