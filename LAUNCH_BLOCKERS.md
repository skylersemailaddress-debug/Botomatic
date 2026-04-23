# Botomatic Launch Blockers

Status: Phase 1
Purpose: Central source of truth for all launch-blocking gaps preventing enterprise release.

---

## P0 — Must be closed for enterprise launch

### UI / Control Plane
- No fully implemented operator UI system
- Missing build pipeline visualization
- Missing packet/job inspection UI
- Missing artifact/diff viewer
- Missing validation/readiness UI
- Missing approval/repair UI

### Security / Governance
- No enterprise identity (SSO/OIDC/SAML)
- No RBAC
- No approval gating for risky actions
- No full audit log system

### Reliability / Execution
- No defined retry policy by failure class
- No dead-letter handling
- No guaranteed idempotency for mutating operations
- Partial replay coverage only

### Validation / Launch Readiness
- Validation exists but is not a full launch gate system
- No full evidence bundle for releases
- No strict pass/fail launch criteria enforcement

### Builder Capability
- Blueprint depth not fully expanded
- Autonomy scoring not fully developed
- Output quality not benchmarked to enterprise baseline

### Repo / Product Posture
- Repo still describes system as MVP/scaffold
- Release-state documentation not complete

---

## P1 — Required for strong enterprise release

- Full observability layer (metrics, traces, alerts)
- Advanced replay/repair logic
- Expanded adapter ecosystem
- Stronger output quality guarantees
- Operator diagnostics tooling

---

## P2 — Enhancements

- Cost visibility
- Performance optimization
- Advanced UI polish
- Extended integrations

---

## Closure rules

- P0 blockers must all be closed before claiming enterprise launch readiness
- Each blocker must have:
  - linked implementation
  - linked documentation
  - linked validator
- A blocker is not closed until validator passes

---

## Audit rule

Future audits must reference this file and explicitly state:
- which P0 blockers are open
- which are closed
- which validators pass/fail

No audit may claim enterprise readiness while any P0 blocker remains open.