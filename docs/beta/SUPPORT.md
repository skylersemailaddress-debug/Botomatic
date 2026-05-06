# Botomatic Friends-and-Family Beta Support

This page explains how invited Botomatic beta users report bugs, request help, and submit feedback.

## Support model

Beta support is best-effort unless a separate written agreement explicitly provides a different commitment. There is no public-launch SLA for this friends-and-family beta.

The Botomatic team prioritizes issues by user impact, security risk, tenant isolation risk, data handling risk, reproducibility, and whether a workaround exists.

## How users report bugs

Use the support channel provided in your invitation. If your invitation does not list one, contact your Botomatic sponsor directly and include `Botomatic beta support` in the subject or first line.

For each bug report, include:

- severity: blocker, major, minor, confusing, performance, or feature request;
- affected project ID, organization, page, API route, or generated artifact if available;
- exact steps to reproduce;
- expected result and actual result;
- timestamp and timezone;
- browser, operating system, and network context;
- screenshots, logs, or screen recordings with secrets and personal data removed;
- whether you can reproduce in a new beta project with synthetic data.

## How beta users should submit feedback

Submit feedback through the same invitation support channel. Useful feedback includes:

- what you were trying to build;
- where the workflow felt unclear or slow;
- where generated output was wrong, incomplete, unsafe, or surprisingly helpful;
- any wording in the docs or UI that overpromises the beta;
- suggested prioritization for limitations that block your commercial evaluation.

## Security issues

Report suspected security issues immediately. Use the highest-priority support path available to you and mark the report `Security - beta`.

Security reports should include affected project IDs, route names, timestamps, observed access boundaries, and screenshots with secrets removed. Do not probe other tenants, continue attempting access, or share the issue publicly.

## Data deletion or export requests

Use `docs/beta/DATA_DELETION_EXPORT.md` for deletion and export requests. Support may ask you to verify project ownership or invitation identity before acting.

## Incident handling

If support suspects tenant isolation failure, auth bypass, sensitive-data exposure, persistent data loss, or a severe availability issue, the team should switch from normal support to the incident workflow in `docs/beta/INCIDENT_CHECKLIST.md`.

## Escalation and communication

The team may respond with one or more of these actions:

- request more reproduction detail;
- provide a workaround;
- mark the issue as a known limitation;
- disable or hide an affected beta surface;
- roll back a beta deployment;
- open an incident review;
- decline a request that is outside beta scope.

## Beta gate reminder

Support should not tell users the beta is ready when the fail-closed beta gate in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md` is failing or missing required evidence.
