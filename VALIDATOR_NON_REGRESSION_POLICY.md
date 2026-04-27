# Validator Non-Regression Policy

Status: Active

## Rules

- Existing validators cannot be removed or weakened to pass a change.
- Thresholds are immutable unless explicitly approved by a human reviewer.
- Any self-upgrade must run relevant targeted validators and full regression validators.
- Critical validator failure always blocks completion claims.

## Required checks per self-upgrade

- targeted validators for changed modules
- `npm run -s validate:all`
- benchmark/runtime checks when changing quality gates
