# GAP-C3-004 Restart / Resume Safety Proof

## Status
Open → Awaiting runtime proof

## Gate
Gate 3 — Runtime safety and reliability

## Objective
Prove that restart or crash behavior is safe, idempotent, and does not create duplicate execution or corrupt state.

## Known current state (from runtime proof so far)
- project: proj_1776968307269
- after restart:
  - packets/status/audit remained coherent
  - m1-p1 blocked, others pending
  - audit shows exactly one execute_packet and one packet_failed
  - no duplicate resumed execution events

## Code-level guarantees already present

### 1. Idempotency guard (processJob)
- packets in states [executing, blocked, failed, complete] are rejected
- prevents duplicate execution on resume

### 2. Durable audit persistence
- auditEvents persisted through durableRepo mapping
- restart cannot lose audit trail

### 3. Worker bootstrap gating
- queue worker only starts in durable mode
- prevents memory-mode leakage

## Remaining risk surface

Restart safety must still be proven against:

1. in-flight job lease expiry
2. partial execution between persist steps
3. double-claim race across restart boundary

## Required proof scenario (deterministic)

Run exactly this sequence:

1. Start API in durable mode
2. Create project and run until packet enters executing
3. Force crash (kill process) during execution
4. Restart API
5. Observe:
   - no duplicate execute_packet events
   - no duplicate packet_failed events
   - packet remains in correct terminal state
   - queue does not re-run completed or failed packet
6. Attempt replay:
   - must return 409 if not repairable
   - must not mutate state

## Pass criteria

PASS only if ALL are true:

- exactly one execution event per packet
- exactly one terminal state transition per packet
- no duplicate job processing after restart
- audit log is continuous and consistent
- replay does not introduce side effects when not allowed

## Fail conditions

FAIL if ANY occur:

- duplicate execution or failure events
- packet re-executes after restart without explicit replay
- audit log resets, truncates, or duplicates
- queue processes stale job after restart

## Closure rule

This gap is CLOSED only when:

- scenario is reproduced cleanly
- results match pass criteria
- output is captured and attached as proof

## Next step

Run this scenario against proj_1776968307269 or equivalent and attach output logs.
