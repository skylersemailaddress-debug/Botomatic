# Upload abuse

## Symptoms
- Repeated oversized or malicious uploads hit intake safeguards.
- Upload routes start failing at a much higher rate.

## Detection
- Monitor `botomatic_upload_failures_total`, `botomatic_provider_errors_total`, and structured logs for upload validation failures.
- Inspect audit events and request logs for repeated actor IDs or tenant IDs.

## Mitigation steps
1. Identify the abusive actor/tenant from structured logs.
2. Block or rate-limit the actor at the edge/application layer.
3. Review the related project evidence bundle for prior failed uploads.
4. Confirm normal uploads succeed again before removing temporary blocks.

## Escalation path
- Notify the on-call operator when abuse causes service degradation.
- Escalate to security if uploads appear malicious or coordinated across tenants.
