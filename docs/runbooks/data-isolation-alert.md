# Data isolation alert

## Symptoms
- A tenant can see another tenant’s project or evidence.
- Audit trails show unexpected project access or support misuse.

## Detection
- Review denied-access and support audit events in `/admin/projects/:projectId/evidence-bundle`.
- Check structured logs for mismatched `tenantId`, `projectId`, or unexpected admin route access.

## Mitigation steps
1. Freeze affected operator/support actions.
2. Collect evidence bundles for impacted projects.
3. Confirm project ownership and tenant identifiers before restoring access.
4. Rotate credentials/tokens if cross-tenant exposure may involve auth compromise.

## Escalation path
- Trigger the security incident process immediately.
- Escalate to security leadership and privacy/compliance contacts for any confirmed leak.
