# Friends-and-family beta operations packet

Date: 2026-05-06

## Scope

This packet is for a **supervised friends-and-family workflow pilot** only. It is not a public launch packet and not an unsupervised commercial beta approval.

Allowed pilot scope:

- Invite-only testers selected by the operator.
- Supervised workflow/orchestration feedback.
- Fresh-project runs only when the operator is watching logs and can stop the run.
- Local or approved preview environments only after the relevant proof gate passes.
- Explicit caveat that durable restart/resume, external executor output, protected commercial access, and deployment may be unavailable unless separately proven for the pilot environment.

Out of scope until additional proof passes:

- Public launch.
- Paid customer onboarding.
- Unsupervised generated-app delivery.
- Production deployment promises.
- Protected multi-tenant commercial access claims.
- Durable recovery guarantees.

## Tester caveats to send before invite

Send this exact caveat text before inviting a tester:

> You are joining a supervised friends-and-family pilot. Botomatic is being tested for workflow and orchestration behavior. It is not production-ready. Runs may fail, pause, or require operator intervention. Do not use confidential customer data. Do not rely on generated output for business-critical work. Deployment, durable recovery, protected commercial access, and external-executor behavior are only available if explicitly confirmed for your test run.

## Access model

- Use least-privilege tester credentials only.
- Do not share broad admin credentials with testers.
- Do not hardcode API tokens, OIDC secrets, Supabase keys, executor keys, deployment tokens, or webhook URLs.
- Use approved secret injection for every credentialed proof or pilot run.
- Disable or rotate tester credentials immediately after the pilot if there is any suspected exposure.

## Operator preflight checklist

Before inviting any tester, the operator must verify:

1. The proof branch has merged to `main`.
2. `npm run build` passed on `main`.
3. `npm run test` passed on `main` and includes `test:orchestration-core`.
4. `npm run validate:all` passed on `main`.
5. `npm run proof:orchestration-core` passed on `main`.
6. If real generated output is in scope, approved executor credentials are configured and the fresh-project path has passed.
7. If durable recovery is in scope, approved Supabase credentials are configured and durable restart/resume proof has passed.
8. If protected access is in scope, OIDC or bearer-token auth proof has passed with least-privilege tester access.
9. If deployment or preview sharing is in scope, deployment dry-run/preview smoke and rollback proof has passed.
10. A support channel and incident owner are assigned for the pilot window.

## Monitoring and evidence capture

For every tester run, capture:

- Tester identifier or invite ID.
- Run ID and project ID.
- Timestamp of intake, compile, plan, enqueue, worker claim, worker finalize, and generated output materialization.
- Queue/job counts and terminal statuses.
- Failure ID, request ID, or log pointer for any failed step.
- Whether operator intervention was needed.
- Whether any secret or credential was used; store only secret references, never plaintext values.
- Tester feedback summary and follow-up owner.

## Incident response

If a tester run fails or behaves unexpectedly:

1. Stop the affected run or disable the affected route if continuing could create bad output or expose data.
2. Preserve logs and proof artifacts.
3. Record the failure ID, run ID, project ID, and visible error.
4. Notify the tester that the run is paused for investigation.
5. Do not retry with elevated credentials unless the operator explicitly approves the retry.
6. If a secret may have been exposed, rotate it before continuing.
7. Update the gap audit before inviting more testers if the failure changes readiness posture.

## Disable / rollback procedure

- Revoke tester credentials or remove tester invite access.
- Stop any local/API process serving the test environment.
- Disable deployment or preview sharing if a preview proof is failing.
- Revert the pilot branch or deployment to the last known-good commit if code changes caused the incident.
- Record the rollback/disable action in the run notes.

## Privacy and data boundaries

- Testers must not upload confidential customer data, credentials, regulated data, payment data, or production secrets.
- Logs may include prompts, generated file names, project IDs, run IDs, and error messages.
- Logs must not store plaintext secrets.
- Pilot feedback may be used to improve Botomatic readiness.

## Go / no-go rule

- **No-go** for unsupervised friends-and-family commercial beta while any P0 proof gate remains open.
- **Conditional go** for a supervised pilot only after merge-to-main proof passes and the operator explicitly scopes which credentialed capabilities are available.
