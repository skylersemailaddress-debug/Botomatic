# Botomatic Friends-and-Family Beta Terms

These beta terms set expectations for invited Botomatic friends-and-family commercial beta users. They are operational beta terms for this repository's private beta documentation pack and do not replace a signed customer agreement if one exists.

## Invitation-only access

Access is limited to invited users and invited organizations. Do not share beta links, tokens, project IDs, screenshots containing private data, or generated artifacts outside your invited team unless the Botomatic team has approved it.

Botomatic may pause, revoke, or change access to protect users, investigate incidents, run migrations, or roll back a beta release.

## Beta nature and no public-launch SLA

This is not a public launch. Botomatic may have defects, incomplete workflows, unavailable routes, slower responses, data-retention changes, and manual support handling.

No public-launch SLA is offered unless a separate written agreement explicitly says otherwise. Beta support targets are best-effort and may vary by severity, team availability, and incident load.

## Appropriate use

Use Botomatic only for beta-scoped app planning, generation, validation, and review workflows. You are responsible for reviewing all generated code, product plans, configuration, deployment guidance, and evidence before using them outside the beta.

Do not use the beta to operate critical infrastructure, production customer traffic, emergency services, medical treatment, regulated financial decisions, or other high-risk activities.

## Data users should enter

You may enter:

- non-sensitive project descriptions;
- fictional or synthetic sample users;
- public product requirements;
- placeholder copy and images that you have rights to use;
- non-secret technical constraints such as preferred framework, database type, or deployment target.

## Data users should not enter

Do not enter:

- passwords, API keys, OAuth client secrets, private keys, recovery codes, or seed phrases;
- customer production data or confidential third-party data;
- payment card data, bank account data, tax identifiers, or payroll records;
- protected health information, legal case facts, biometric data, or government identity documents;
- export-controlled, classified, or highly confidential business records;
- data you do not have permission to upload or process.

## Security posture and beta caveats

Botomatic's hosted beta posture is designed around fail-closed access checks, private beta gating, route authorization, durable repository requirements outside local development, and no-secrets evidence checks. These controls reduce risk but do not eliminate beta risk.

Because this is a beta, some controls may be manual, some evidence may be environment-specific, and some issues may be discovered by invited users. Report suspected security issues immediately through `docs/beta/SUPPORT.md` and avoid probing other users' projects.

## Rollback and data-change expectations

Botomatic may roll back a beta release if smoke checks fail, auth behavior regresses, data isolation concerns appear, or user-impacting defects are discovered. During rollback:

- access may be temporarily unavailable;
- newly generated beta artifacts may be delayed, regenerated, or removed if unsafe;
- data created after the last known-good release may require manual review;
- the team will prioritize preserving tenant isolation and preventing unsafe access over feature availability.

## Feedback and bug reports

Submit feedback using `docs/beta/SUPPORT.md`. By sending feedback, you allow Botomatic to use it to improve the product, docs, validators, support process, and beta operations without a separate obligation to implement a requested change.

## Beta gate reminder

The private beta depends on the fail-closed beta gate in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md`. If required evidence is missing or failing, Botomatic should not be represented as beta-ready for invited users.
