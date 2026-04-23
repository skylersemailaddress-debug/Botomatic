# BOTOMATIC_FINAL_CLOSURE_PROGRAM

Status: Active
Mode: Launch Closure Mode
Purpose: Convert Botomatic from a real but drift-prone partial enterprise system into a provably launch-clean system.

## Non-negotiable operating rule

From this point forward, no launch-critical gap is considered closed by:
- file presence
- route presence
- string presence
- screenshots
- docs alone
- AI narrative
- phase labels

A gap closes only by:
- runtime proof
- executable validation
- reproducible scenario evidence
- UI/docs that accurately reflect the same truth

## Scope freeze

Until all final launch gates pass, do not do:
- new major features
- new major UI panels unrelated to a failing gate
- broad redesign
- speculative polish
- roadmap expansion
- enterprise-sounding surface work without proof impact

Allowed work only:
- bootstrap cleanup
- runtime cleanup
- validator replacement and hardening
- UI truthfulness cleanup
- auth/governance hardening
- gate/deployment/rollback completion
- audit/observability completion
- docs/runtime reconciliation

## Final launch gates

Botomatic is judged only by these 7 gates.

### Gate 1 - Fresh clone bootstrap
Must prove all of the following:
- fresh clone installs cleanly
- dependency declarations are complete and accurate
- env setup is predictable
- one root launch path exists for local operator use
- API boots cleanly
- control-plane UI boots cleanly
- health checks confirm both surfaces are up

Closure proof required:
- reproducible fresh-clone bootstrap run
- validator that fails on missing dependencies, bad ports, broken scripts, or boot failure

### Gate 2 - End-to-end operator workflow
Must prove all of the following:
- operator can submit messy input
- compile works
- plan works
- execute works
- live state updates are visible
- packet visibility is real
- artifact visibility is real
- repair or replay works when needed

Closure proof required:
- reproducible end-to-end scenario run
- validator that exercises the real control loop, not file presence

### Gate 3 - Runtime safety and reliability
Must prove all of the following:
- local mode behaves safely
- durable mode behaves safely
- memory mode never touches durable infrastructure
- retry behavior is explicit and correct
- failure paths do not corrupt state
- duplicate or dangerous work is prevented
- restart or crash behavior is safe and predictable

Closure proof required:
- runtime failure-injection scenarios
- validator coverage for mode safety, retries, resumability, and idempotency

### Gate 4 - Auth, governance, and roles
Must prove all of the following:
- enterprise auth path works live
- fallback modes are explicit and safe
- role enforcement works live
- dangerous actions are restricted correctly
- actor identity is trustworthy
- governance or approval behaviors are real where required

Closure proof required:
- runtime auth and permission tests
- validator that checks behavioral enforcement rather than config presence

### Gate 5 - Gate, deployment, and rollback
Must prove all of the following:
- blocked systems cannot promote
- ready systems can promote
- deployment state persists accurately
- UI and backend deployment state stay synchronized
- rollback exists and works
- gate status is real and trustworthy

Closure proof required:
- runtime promote and rollback scenarios
- validator that checks blocked and ready cases

### Gate 6 - Observability and auditability
Must prove all of the following:
- operators can see what happened
- failures are diagnosable from the product surface
- actor or source attribution is visible where required
- packet or run history is usable
- artifact and state transitions are understandable

Closure proof required:
- runtime audit and failure diagnosis scenario
- validator that checks operational surfaces for truthfulness and presence of required data

### Gate 7 - Proof integrity
Must prove all of the following:
- validators reflect runtime truth
- docs reflect runtime truth
- blockers and scorecards do not contradict observed behavior
- no category claims exceed what runtime and validators support

Closure proof required:
- consistency check across runtime scenario results, validator output, and repo docs

## Canonical closure scenario

All closure work is judged against this single scenario:

1. Fresh clone repository
2. Install dependencies from declared manifests only
3. Configure required environment variables using documented setup only
4. Launch the root operator path
5. Confirm API health
6. Confirm control-plane UI health
7. Authenticate using the intended mode for the target environment
8. Submit one messy real-world request
9. Run compile
10. Run plan
11. Run execute
12. Observe live status updates
13. Inspect packets
14. Inspect artifacts
15. Trigger repair or replay if a failure exists
16. Validate launch gate state
17. Attempt blocked promotion case
18. Attempt ready promotion case
19. Verify deployment state
20. Run rollback
21. Compare validator output to observed behavior
22. Compare docs and scorecards to observed behavior

Anything that fails, drifts, lies, or requires manual patching during this scenario becomes an open hard gap.

## Hard-gap register format

Every open item must be tracked in this format only.

| ID | Gate | Observed failure | Expected behavior | Root cause | Proof required to close | Status |
|---|---|---|---|---|---|---|
| GAP-001 | Gate 1 | Example observed failure | Example expected behavior | Example root cause | Example proof | Open |

Allowed status values:
- Open
- Fix in progress
- Awaiting proof
- Closed by proof

Forbidden status values:
- Implemented
- Mostly done
- Phase complete
- Good enough

## Closure order

Fix only in this order.

### Phase A - Bootstrap closure
Target gates:
- Gate 1
- Gate 7 partial

Required outcomes:
- fresh clone works
- install works
- one root launch path works
- API and UI boot cleanly
- dependencies and env setup are correct

### Phase B - UI and runtime closure
Target gates:
- Gate 2
- Gate 7 partial

Required outcomes:
- UI builds cleanly
- UI state is truthful
- all critical UI actions map to real backend behavior
- no false affordances or stale state in the control loop

### Phase C - Mode safety and reliability closure
Target gates:
- Gate 3

Required outcomes:
- memory mode is safe
- durable mode is safe
- retries, resumability, and idempotency are explicit and proven

### Phase D - Auth and governance closure
Target gates:
- Gate 4

Required outcomes:
- auth works live
- role enforcement works live
- dangerous actions are restricted correctly
- governance behaviors are real where required

### Phase E - Gate, deploy, and rollback closure
Target gates:
- Gate 5

Required outcomes:
- gate state is truthful
- blocked promote is blocked
- ready promote works
- rollback works
- UI and backend remain synchronized

### Phase F - Observability and audit closure
Target gates:
- Gate 6

Required outcomes:
- failures are diagnosable
- operators can reconstruct what happened
- audit or trace surfaces are useful and accurate

### Phase G - Proof integrity closure
Target gates:
- Gate 7 final

Required outcomes:
- validators no longer false-pass critical paths
- docs, blockers, scorecards, and runtime are aligned
- launch claim is supported by proof, not narrative

## Validator policy

Critical validators must be behavioral. For final closure, validators that only check file existence, route strings, or text presence are not sufficient for launch-critical claims.

Required validator classes:
- bootstrap validator
- UI build validator
- API boot validator
- auth enforcement validator
- end-to-end operator workflow validator
- mode safety and reliability validator
- gate, deployment, and rollback validator
- proof-integrity validator
- master final launch validator

## Master final launch validator

The master validator must run or orchestrate checks for:
- fresh clone bootstrap
- API boot
- UI boot or build
- auth path
- end-to-end control loop
- packet and artifact visibility
- replay or repair path when applicable
- blocked and ready promotion checks
- rollback check
- docs and scorecard consistency check

Output must be only:
- PASS
- FAIL
- exact failed gate or gates

## Red-team rule

Every claimed closure must be followed by one attempt to break it.

Examples:
- try to make memory mode touch durable infrastructure
- try to make UI show ready while backend is blocked
- try to make validators pass while runtime is broken
- try to promote when blocked
- try to bypass role restrictions
- try to make docs overstate runtime truth

If the claim can be broken, the gap is not closed.

## Definition of done

Botomatic is 10 out of 10 only when all of the following are true:
- all 7 final launch gates pass
- the canonical closure scenario passes from a fresh clone
- no manual patching is required during the scenario
- validators agree with runtime truth
- docs agree with runtime truth
- no launch-critical contradiction remains between UI, runtime, validators, and docs

## Immediate next action

Run the canonical closure scenario and create the first hard-gap register from observed failures only.
