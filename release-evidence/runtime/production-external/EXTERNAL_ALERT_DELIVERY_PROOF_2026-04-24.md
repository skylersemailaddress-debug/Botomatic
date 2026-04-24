# External Alert Delivery Proof

Date: 2026-04-24

## Result

PASS.

## Sink

Slack Incoming Webhook.

The webhook URL is intentionally not committed.

## Runtime

Botomatic API was running in durable + OIDC mode.

Verified externally:

- Auth implementation: oidc
- Repository mode: durable
- Auth0 admin token accepted
- Slack Incoming Webhook configured through BOTOMATIC_ALERT_WEBHOOK_URL

## Triggered route error

Request:

POST /api/projects/intake

Request ID:

external-alert-proof-2026-04-24-real-slack-2

Payload:

{"bad":true}

Result:

HTTP 500 route_error was intentionally triggered.

The response included requestId:

external-alert-proof-2026-04-24-real-slack-2

## Ops/errors proof

/api/ops/errors recorded a matching route_error with:

- type: route_error
- route: POST /api/projects/intake
- actorId: Auth0 client identity
- requestId: external-alert-proof-2026-04-24-real-slack-2
- runtimeMode: development

No alert_delivery_failed entry was returned for this request ID in the observed ops/errors response.

## External Slack delivery proof

The Botomatic Slack workspace channel #all-botomatic received the alert.

Observed Slack message:

- Botomatic Alert
- Category: route_error
- Route: POST /api/projects/intake
- Request ID: external-alert-proof-2026-04-24-real-slack-2
- Runtime Mode: development
- Timestamp: 2026-04-24T21:50:12.777Z
- Message included durable repository insert failure details

## Security note

A webhook URL was exposed during manual testing and must be rotated before production launch. The rotated webhook URL must not be committed.

## Conclusion

External SaaS alert delivery is proven.
