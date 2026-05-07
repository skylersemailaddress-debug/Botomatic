# Provider outage

## Symptoms
- GitHub/cloud intake or deployment-provider steps fail repeatedly.
- Build runs pause or fail at provider-dependent milestones.

## Detection
- Check `botomatic_provider_latency_ms`, `botomatic_provider_errors_total`, and request logs with `errorCategory=provider`.
- Inspect `/admin/build-runs/:buildRunId` for the failing step and last failure payload.

## Mitigation steps
1. Identify the failing provider from metrics labels and structured logs.
2. Disable or defer the affected path and move operators to a degraded/manual workflow.
3. Use `/admin/projects/:projectId/state` to confirm project readiness before replaying.
4. Replay only safe jobs once the provider recovers.

## Escalation path
- Notify the on-call operator and incident commander.
- Escalate to the external provider if error rates stay elevated past the paging threshold.
