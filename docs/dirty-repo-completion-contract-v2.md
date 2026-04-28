# Dirty Repo Completion Contract v2

## What v2 adds over REPO-001
REPO-001 introduced typed dirty-repo evidence capture. REPO-002 adds a strict completion contract v2 that consumes that evidence and emits measurable exit criteria, evidence-linked blockers, proof-consistency checks, and explicit non-launch status boundaries.

## Status meanings
- `blocked`: fail-closed state due to missing/stale evidence or failed critical validator/proof consistency.
- `repair_ready`: proof consistency passed but evidence-linked blockers remain.
- `validation_ready`: blockers resolved but one or more measurable criteria remain unsatisfied.
- `candidate_ready`: blockers resolved, criteria satisfied, and proof consistency passed.

`candidate_ready` is **not** `launch_ready` and not `production_ready`.

## Evidence-linked blocker rules
- Every blocker in v2 must include non-empty `evidenceEntryIds`.
- A blocker without evidence linkage fails v2 validation.

## Proof consistency fail-closed behavior
- If any critical validator is marked failed, proof consistency cannot be `passed`.
- If evidence is missing or stale, proof consistency becomes `needs_evidence` and overall status is blocked.
- The contract cannot pass validation with blockers missing `evidenceEntryIds`.

## Claim boundary
v2 is a completion/readiness contract only. It cannot expand claims to launch/production readiness and must retain user-approval gates before claim-boundary expansion.

## No-code-execution caveat
Contract generation uses metadata/evidence snapshots and planner outputs; it does not execute untrusted repository code during intake or completion-contract generation.
