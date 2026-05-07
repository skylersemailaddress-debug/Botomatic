# Botomatic Friends-and-Family Beta Known Limitations

This page lists expected limitations for invited Botomatic beta users. It should be updated when limitations are fixed, newly discovered, or promoted to incident status.

## Scope of this list

This list covers private beta behavior only. It does not describe a public launch and does not create a public-launch SLA.

## Current supported product surfaces

Supported beta surfaces are limited to:

- invited control-plane access;
- project intake for non-sensitive app ideas;
- project workspace and Vibe Dashboard;
- build map, orchestration status, validators, logs, and evidence views;
- generated app planning and review workflows;
- Live UI Builder preview/edit flows that are enabled in the browser-safe beta path;
- beta deployment smoke proof generation when the hosted beta environment variables are supplied.

## Unsupported surfaces

Unsupported in this beta:

- public signup, public onboarding, and public pricing flows;
- production customer traffic hosting;
- arbitrary provider live deployment without explicit human approval;
- regulated data workloads;
- importing large confidential repositories as authoritative production sources;
- native mobile store publishing;
- no committed uptime, response-time, resolution-time, or support-window target;
- destructive migrations without operator review and rollback planning.

## Known limitations

- Generated plans and code require human review before use outside beta.
- Some generated app domains may need manual edits before they run in a target environment.
- Live UI Builder browser-safe mode can preview and edit supported surfaces but may not apply every server-side source patch path.
- Validator output can identify known readiness gaps but is not exhaustive proof for every product, domain, provider, or integration.
- Deployment smoke checks require a hosted beta URL, beta auth token, and beta project ID; without them, local validation can only document the scope-out path.
- Rollback is documented and may be tested per deployment, but users should expect temporary downtime or artifact regeneration during rollback.
- Performance can vary by project size, generated output size, external service latency, and active beta load.
- Support is best-effort unless a separate written agreement provides a different commitment.
- Evidence artifacts may be regenerated as validators evolve.
- Documentation may lag newly discovered defects until the issue is triaged.

## Security posture and beta caveats

The beta is designed to fail closed when required beta evidence is missing, auth is disabled in hosted environments, durable storage is unavailable outside local development, or deployment smoke inputs are absent. This is a beta caveat, not a guarantee that every defect has been found.

Avoid entering secrets and regulated data. Treat generated output as untrusted until reviewed.

## Rollback expectations

If a release creates a beta-blocking regression, the team may pause access, restore a last known-good deployment, disable affected routes, or regenerate unsafe artifacts. Rollback may temporarily remove access to projects created after the last known-good point while the team reviews compatibility.

## Beta gate reminder

The fail-closed beta gate is documented in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md`. Known limitations should not be interpreted as waived blockers for that gate.
