# Dirty Repo Repair-Loop Proof

## What repair-loop proof means
Dirty repo repair-loop proof is a static, evidence-bound planning artifact that translates intake evidence into ordered repair actions without executing untrusted repository code. It is intended to prove planning safety and traceability, not deployment readiness.

## How evidence maps to actions
- Each repair action is derived from one or more evidence entries.
- Every action must contain non-empty `evidenceEntryIds`.
- Critical/security findings are prioritized before integration/documentation/polish actions.
- Planning includes validation-oriented actions (`add_validator`, approval/evidence requests) to maintain proof integrity.

## Why no untrusted code execution occurs during planning
The repair loop uses only typed evidence snapshot + completion contract v2 metadata and emits a static plan. All planned actions explicitly set `executesUntrustedCode: false`, and safety posture asserts `noUntrustedExecution: true`.

## Why `candidate_ready` is not launch-ready
`candidate_ready` means evidence-bound planning and validation posture is complete enough for controlled candidate review. It is explicitly not `launch_ready` and not `production_ready`, and no claim expansion occurs without additional approvals and runtime evidence.

## Remaining gaps and next steps
- Integrate richer evidence-to-action heuristics for stack-specific repair guidance.
- Add deeper static checks for missing manifest/build scripts.
- Expand proof ledger persistence for cross-run comparison.
- Recommended next issue: `RELEASE-AUDIT-001`.
