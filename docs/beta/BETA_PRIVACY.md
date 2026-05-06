# Botomatic Friends-and-Family Beta Privacy

This privacy note explains what invited users should expect during the Botomatic friends-and-family beta. It is scoped to beta operations and should be read with `docs/beta/BETA_TERMS.md`.

## Beta data categories

Botomatic may process beta data such as:

- account or invitation identifiers needed to provide beta access;
- organization, project, and project-member metadata;
- project prompts, product requirements, generated plans, generated code, validation results, logs, and evidence artifacts;
- support tickets, bug reports, feedback, screenshots, and incident notes you submit;
- operational telemetry needed to keep the beta reliable, secure, and auditable.

## What users should enter

Enter only non-sensitive beta project information: synthetic examples, public requirements, fictional users, sample copy, and non-secret technical preferences.

## What users should not enter

Do not enter secrets, regulated data, confidential customer records, payment data, health data, legal case data, government identity data, biometric data, or any data you are not permitted to process in a private beta.

If you accidentally enter sensitive data, stop using the affected project and follow `docs/beta/DATA_DELETION_EXPORT.md` and `docs/beta/SUPPORT.md`.

## How beta data is used

Botomatic beta data may be used to:

- provide the requested project workspace and app-generation workflow;
- debug failures, investigate incidents, and respond to support requests;
- improve prompts, validators, docs, product flows, and beta operations;
- verify tenant isolation, route authorization, durable storage behavior, no-secrets evidence, and deployment smoke checks.

## Access boundaries

The intended boundary is that invited users can access only their authorized beta projects and organization context. Botomatic team access should be limited to operating the beta, providing support, investigating bugs, validating evidence, and handling incidents or deletion/export requests.

Do not attempt to access another user's project, organization, logs, generated artifacts, evidence, or route data. Report any unexpected access immediately.

## Retention during beta

Retention may change during beta as workflows stabilize. Unless a separate agreement says otherwise, Botomatic may retain beta project data, logs, evidence, and support records for the period needed to operate the beta, investigate issues, improve the product, and satisfy security or audit needs.

Deletion and export requests are handled through `docs/beta/DATA_DELETION_EXPORT.md`.

## Security posture and beta caveats

Botomatic's beta privacy posture relies on invitation-only access, hosted auth checks, tenant/project isolation proof requirements, no-secrets scanning, durable storage requirements outside local development, and the fail-closed beta gate in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md`.

The beta gate reduces the chance of unsafe beta operation, but invited users should still assume beta workflows can contain defects and should avoid entering sensitive data.

## Subprocessors and external services

Botomatic may use infrastructure, model, observability, repository, deployment, and support tooling needed to operate the beta. Do not enter data that would require a specific regulated processing agreement unless that agreement is already in place.

## Questions or requests

For privacy questions, deletion requests, export requests, or accidental sensitive-data entry, use the process in `docs/beta/DATA_DELETION_EXPORT.md` and the support path in `docs/beta/SUPPORT.md`.
