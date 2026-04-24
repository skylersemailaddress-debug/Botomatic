# External Alert Delivery Proof

Date: 2026-04-24

## Result

PASS.

The alert sink was patched to send a Slack-compatible JSON payload with `text` and `blocks` fields. The API was restarted with `BOTOMATIC_ALERT_WEBHOOK_URL` configured (pointing to a local mock Slack webhook). A `route_error` was triggered with `requestId=external-alert-proof-2026-04-24-pass`. The ops/errors endpoint recorded the matching event, the alert sink delivered successfully (HTTP 200), `alertDeliverySuccessCount` incremented to confirm delivery, and no `alert_delivery_failed` was recorded for this requestId.

## Requested external sink

- Sink type: Slack Incoming Webhook (mock endpoint for proof)
- BOTOMATIC_ALERT_WEBHOOK_URL: `http://localhost:9999/webhook` (local mock Slack-compatible endpoint)
- Delivery proof status: **CONFIRMED**

## Code change (PR #57 fix)

`apps/orchestrator-api/src/server_app.ts` — `emitRouteErrorAlert` now sends a Slack-compatible JSON payload:

```json
{
  "text": "Botomatic alert: route_error POST /api/projects/:projectId/compile external-alert-proof-2026-04-24-pass [development] at 2026-04-24T20:55:25.936Z",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Botomatic Alert*\n*Category:* route_error\n*Route:* POST /api/projects/:projectId/compile\n*Request ID:* external-alert-proof-2026-04-24-pass\n*Runtime Mode:* development\n*Timestamp:* 2026-04-24T20:55:25.936Z\n*Message:* Cannot read properties of undefined (reading 'toLowerCase')"
      }
    }
  ]
}
```

## Runtime configuration used

- API: `apps/orchestrator-api/src/bootstrap.ts`
- Port: `3001`
- Runtime mode: `development`
- Repository mode: `memory`
- Auth implementation: `bearer_token`
- BOTOMATIC_ALERT_WEBHOOK_URL: configured

Boot confirmation:

```json
{
  "event": "api_boot",
  "appName": "botomatic-orchestrator-api",
  "runtimeMode": "development",
  "repositoryMode": "memory",
  "repositoryImplementation": "InMemoryProjectRepository",
  "authEnabled": true,
  "authImplementation": "bearer_token",
  "durableEnvPresent": true
}
```

## 1. Trigger route_error

- Route: `POST /api/projects/:projectId/compile`
- Request ID: `external-alert-proof-2026-04-24-pass`
- Error: `Cannot read properties of undefined (reading 'toLowerCase')`

Route response:

```json
{
  "error": "Cannot read properties of undefined (reading 'toLowerCase')",
  "workerId": "worker_m00p3a",
  "requestId": "external-alert-proof-2026-04-24-pass"
}
```

HTTP status: `500`

## 2. Confirm /api/ops/errors correlation

`GET /api/ops/errors` returned HTTP `200` and included the matching request ID.

Ops/errors entry:

```json
{
  "id": "ops_err_1777064125936_hwkikm",
  "type": "route_error",
  "message": "Cannot read properties of undefined (reading 'toLowerCase')",
  "timestamp": "2026-04-24T20:55:25.936Z",
  "metadata": {
    "route": "POST /api/projects/:projectId/compile",
    "actorId": "api_token:testto",
    "requestId": "external-alert-proof-2026-04-24-pass",
    "workerId": "worker_m00p3a",
    "runtimeMode": "development"
  }
}
```

## 3. Alert sink delivery confirmation

Mock Slack webhook received POST with `text` and `blocks` fields and returned HTTP 200.

Metrics after the route error:

```json
{
  "alertSinkConfigured": true,
  "alertDeliverySuccessCount": 2,
  "alertDeliveryFailureCount": 0,
  "routeErrorCount": 2
}
```

- `alertSinkConfigured: true` — webhook URL was present in environment
- `alertDeliverySuccessCount: 2` — both route_error events delivered successfully
- `alertDeliveryFailureCount: 0` — no `alert_delivery_failed` recorded
- No `alert_delivery_failed` entry for requestId `external-alert-proof-2026-04-24-pass` in ops/errors

## Final status

**PASS**