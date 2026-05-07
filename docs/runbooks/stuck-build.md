# Stuck build

## Symptoms
- A build run stays `running` or stops updating.
- Support cannot determine the next milestone from the UI alone.

## Detection
- Inspect `/admin/build-runs/:buildRunId` for timestamps, checkpoint logs, and blockers.
- Cross-check `/admin/projects/:projectId/state` and `/admin/job-queue` for related queued/running jobs.

## Mitigation steps
1. Pull the build run detail and note the last updated timestamp.
2. Review checkpoint logs and related structured logs in `/admin/projects/:projectId/evidence-bundle`.
3. If the run is unrecoverable, force-cancel with `/admin/build-runs/:buildRunId/cancel`.
4. Replay only safe jobs via `/admin/jobs/:jobId/replay` after fixing the root cause.

## Escalation path
- Page the on-call operator if the build exceeds the stuck-build threshold.
- Escalate to the owning feature team if repeated cancellations occur for the same milestone.
