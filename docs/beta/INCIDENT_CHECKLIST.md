# Botomatic Friends-and-Family Beta Incident Checklist

Use this checklist for suspected incidents during the invited Botomatic friends-and-family beta. Normal bugs stay in `docs/beta/SUPPORT.md`; suspected security, privacy, data isolation, data loss, or severe availability events use this checklist.

## Incident triggers

Start incident handling when there is suspected or confirmed:

- tenant or project isolation failure;
- auth bypass, wrong-role access, expired-session acceptance, or sensitive-route exposure;
- committed secret, exposed token, leaked key, or credential misuse;
- accidental regulated or confidential data exposure;
- persistent data corruption, deletion, or cross-project artifact mix-up;
- beta deployment causing severe user impact;
- failed rollback or inability to identify a last known-good release.

## First response

1. Assign an incident owner and scribe.
2. Capture time, reporter, affected projects, affected users, suspected data categories, and initial severity.
3. Preserve relevant logs and evidence while avoiding unnecessary sensitive-data copying.
4. Stop unsafe activity: disable affected routes, pause beta access, revoke tokens, or block project actions as needed.
5. Move communication to the highest-priority beta support path.

## Containment

Containment actions may include:

- disabling or hiding an affected beta surface;
- revoking or rotating exposed credentials;
- blocking unauthenticated or wrong-role routes;
- pausing project generation or deployment smoke runs;
- switching to the last known-good beta deployment;
- quarantining affected generated artifacts;
- preserving tenant boundaries over feature availability.

## Investigation

Investigate:

- first known occurrence and detection source;
- affected users, organizations, projects, routes, artifacts, and logs;
- whether secrets or prohibited data were involved;
- whether fail-closed auth, route authorization, durable storage, tenant isolation, no-secrets, or deployment smoke evidence changed;
- whether the incident is reproducible;
- whether data deletion/export follow-up is needed.

## User communication

For affected beta users, communicate what is known, what is still under investigation, immediate mitigation, user actions needed, and expected next update. Avoid claiming final root cause before investigation is complete.

## Rollback expectations

Rollback is appropriate when a new beta release breaks auth, tenant isolation, data integrity, core project workflows, or supportability. Use the rollback procedure in `docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md`:

1. identify the last known-good release SHA, deployment ID, and migration state;
2. restore the known-good deployment or disable the affected route;
3. handle schema compatibility or down migration if needed;
4. run post-rollback smoke checks;
5. document the action and any data review needed.

Users should expect temporary unavailability, disabled routes, or artifact regeneration during rollback.

## Recovery

Before restoring normal beta access:

- confirm the unsafe path is blocked or fixed;
- rerun relevant tests, validators, or proof scripts;
- update known limitations or support guidance if the issue remains partially open;
- verify deletion/export follow-up if sensitive data was involved;
- record evidence and owner sign-off.

## Post-incident review

After recovery, document:

- timeline;
- impact;
- root cause or best current understanding;
- what worked and what failed;
- corrective actions;
- docs or validator updates;
- whether the beta gate should remain closed until new evidence is produced.

## Beta gate reminder

The fail-closed beta gate in `docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md` must remain closed when required proof artifacts are missing, stale, unparsable, or failing. Incident closure should not rely on manual reassurance when gate evidence is required.
