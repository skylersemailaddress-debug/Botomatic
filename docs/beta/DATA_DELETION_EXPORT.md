# Botomatic Friends-and-Family Beta Data Deletion and Export

This page defines the beta process for deletion, export, and accidental sensitive-data requests.

## Request types

Invited beta users may request:

- deletion of a beta project;
- deletion of an organization or invitation record where feasible;
- export of project prompts, generated plans, generated code, validator output, logs, and evidence artifacts that belong to their authorized beta project;
- review and removal of accidentally submitted sensitive data.

## How to submit a request

Use the support path in `docs/beta/SUPPORT.md` and include:

- request type: deletion, export, or accidental sensitive data;
- your invited email or organization identity;
- project ID or project name;
- data categories involved;
- whether access should be paused during review;
- preferred secure delivery path for exports, if already agreed with the Botomatic team.

Do not include secrets or regulated data in the support message. Describe the category and location instead.

## Verification

Before acting, Botomatic may verify that the requester is authorized for the project or organization. Verification may include checking invitation identity, organization membership, project ownership, and recent access context.

## Deletion handling

Deletion requests are handled as beta operations tasks. Depending on storage layout and evidence requirements, deletion may include:

1. confirming the requester and affected project scope;
2. pausing access to the affected project if needed;
3. deleting or redacting project prompts, generated artifacts, logs, and evidence where feasible;
4. recording what was deleted, retained, or redacted;
5. confirming completion or explaining any records retained for security, audit, legal, backup, or incident reasons.

Backup, audit, and incident records may not disappear immediately. The team should minimize retained sensitive content and document any retention reason.

## Export handling

Exports are provided only for authorized beta projects. The team may package available prompts, generated plans, generated code, validation output, logs, and evidence artifacts. Exports may exclude internal security notes, other tenants' data, infrastructure secrets, model-provider internals, or records that would compromise security.

## Accidental sensitive-data handling

If a user enters data they should not have entered:

1. stop using the affected project;
2. report the category and location through support without repeating the sensitive value;
3. the team should restrict access if needed;
4. the team should delete, redact, or quarantine affected artifacts where feasible;
5. if exposure may have affected another user or system boundary, follow `docs/beta/INCIDENT_CHECKLIST.md`.

## Expected timing

No public-launch SLA is offered for deletion or export unless a separate written agreement explicitly says otherwise. The team should acknowledge requests as soon as practical, prioritize sensitive-data and security-related requests, and communicate if manual review or incident handling is required.

## Beta gate reminder

Deletion/export handling does not bypass the fail-closed beta gate in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md`. If data handling evidence or tenant isolation evidence is missing or failing, beta access should be paused or limited until the blocker is resolved.
