# Drift Prevention Policy

Status: Active

Botomatic must prevent drift in architecture, validation posture, and product scope.

## Drift controls

- Architecture Drift Detector runs during self-upgrade planning.
- Regression Guard runs before self-upgrade completion claim.
- Claim Verifier checks that claims are backed by validator evidence.
- Proof ledger records what changed, why, and what passed/failed.

## Drift failure handling

If drift is detected:
- mark self-upgrade as blocked
- emit blocker reason
- require either corrective patch or explicit human waiver
