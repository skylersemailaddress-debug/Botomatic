# Botomatic Friends-and-Family Beta Onboarding

This guide is for invited friends-and-family commercial beta users of Botomatic. This is a private beta, not a public launch, and access may change as we fix issues, roll back releases, or tighten the beta gate.

## Who the beta is for

The Botomatic beta is for invited operators, founders, builders, and close commercial design partners who can tolerate rough edges while testing Botomatic's app-building workflow. Beta users should be willing to:

- try scoped project intake and app-generation workflows;
- review generated plans, validators, logs, and evidence before relying on outputs;
- report bugs with enough detail for the Botomatic team to reproduce them;
- avoid entering sensitive regulated data, secrets, or customer production data;
- accept that beta access is invitation-only and may be paused for maintenance, incident response, or rollback.

## What to have ready

Before starting, prepare a small test project brief that does not contain secrets or regulated personal data. Good beta prompts include product goals, target users, required pages, preferred stack constraints, and sample non-sensitive content.

Do not use the beta as the only system of record for your business, source code, credentials, legal records, payment records, or customer support history.

## Current supported product surfaces

The invited beta currently focuses on these Botomatic surfaces:

- Control-plane project workspace and Vibe Dashboard.
- Project intake for scoped app ideas.
- Build map and orchestration progress views.
- Generated app planning, validation, logs, evidence, and launch-readiness summaries.
- Live UI Builder preview and edit workflows where the browser-safe adapter supports them.
- Beta deployment smoke evidence for hosted beta environments when `BOTOMATIC_BETA_BASE_URL`, `BOTOMATIC_BETA_AUTH_TOKEN`, and `BOTOMATIC_BETA_PROJECT_ID` are provided by the operator.

## Unsupported surfaces

The beta does not currently support these as user-facing promises:

- public self-service signup;
- public marketplace, plugin marketplace, or third-party app store distribution;
- general-purpose hosting for production customer traffic;
- unsupervised live deployment to arbitrary cloud providers;
- migration of existing production systems without human review;
- regulated workloads such as HIPAA, PCI cardholder data, financial account records, or legal case data;
- native mobile app-store submission workflows;
- guaranteed support windows or a public-launch SLA.

## First session checklist

1. Confirm you received the private beta invitation and expected access path from the Botomatic team.
2. Read `docs/beta/BETA_TERMS.md`, `docs/beta/BETA_PRIVACY.md`, and `docs/beta/KNOWN_LIMITATIONS.md` before entering project data.
3. Create or use a beta-scoped project, not a real production project.
4. Enter only non-sensitive test prompts and sample data.
5. Run through the project workspace, Vibe Dashboard, build map, validators, logs, and evidence views.
6. Review generated output before copying it outside Botomatic.
7. Submit feedback using the paths in `docs/beta/SUPPORT.md`.

## Feedback expectations

Helpful beta feedback includes:

- what you expected Botomatic to do;
- what actually happened;
- the project ID or session reference if available;
- screenshots or short screen recordings that exclude secrets and personal data;
- browser, operating system, approximate time, and affected page or API route;
- severity: blocker, confusing, incorrect output, performance issue, or feature request.

## Beta gate reminder

Botomatic uses a fail-closed beta gate before private beta readiness can be claimed. The gate is described in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md` and requires evidence for tenant isolation, hosted auth fail-closed behavior, no-secrets checks, durable orchestration, durable-storage outage behavior, and beta deployment smoke or documented local scope-out.
