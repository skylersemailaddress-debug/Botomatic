# Supabase outage

## Symptoms
- `/health` remains up but queue-backed work stops progressing.
- Durable project reads or writes fail with storage/auth errors.

## Detection
- Check `botomatic_queue_depth`, `botomatic_worker_count`, and `botomatic_provider_errors_total`.
- Review structured logs for `errorCategory=provider` and `route_error` events mentioning Supabase.

## Mitigation steps
1. Confirm `SUPABASE_URL` and service-role credentials are still valid.
2. Pause new build intake if queue depth keeps rising.
3. Use `/admin/job-queue` and `/admin/projects/:projectId/evidence-bundle` to identify impacted tenants.
4. Restore Supabase connectivity, then replay safe jobs through `/admin/jobs/:jobId/replay`.

## Escalation path
- Page the on-call backend operator.
- Escalate to the Supabase service owner/vendor contact if outage exceeds the internal SLO window.
