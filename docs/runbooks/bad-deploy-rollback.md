# Bad deploy rollback

## Symptoms
- New deploy causes elevated request failures, auth denials, or broken support flows.
- Operators observe regressions immediately after a release.

## Detection
- Check `botomatic_request_total`, `botomatic_error_rate`, and structured request logs by route.
- Compare `/health` output and recent `/admin/projects/:projectId/evidence-bundle` snapshots before/after deploy.

## Mitigation steps
1. Identify the release window and impacted routes.
2. Roll back the deploy using the platform’s last-known-good artifact/process.
3. Validate `/ops/metrics`, `/health`, and one admin route after rollback.
4. Preserve evidence bundles and request logs for post-mortem analysis.

## Escalation path
- Notify release owner and on-call operator immediately.
- Escalate to engineering management if rollback fails or customer impact is ongoing.
