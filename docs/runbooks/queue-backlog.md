# Queue backlog

## Symptoms
- Jobs remain queued for an extended period.
- Operators report delayed packet execution or stuck projects.

## Detection
- Monitor `botomatic_queue_depth`, `botomatic_job_success_total`, and `botomatic_job_failure_total`.
- Use `/admin/job-queue?status=queued` to confirm backlog size and affected projects.

## Mitigation steps
1. Check `botomatic_worker_count` and confirm workers are active.
2. Inspect queued jobs by project and replay only safe jobs if needed.
3. Temporarily pause new enqueue sources if depth keeps growing.
4. Drain backlog after the blocking dependency or worker issue is resolved.

## Escalation path
- Page on-call when queue depth breaches the agreed threshold or backlog duration breaches the SLO.
- Escalate to platform/database support if workers cannot claim jobs.
