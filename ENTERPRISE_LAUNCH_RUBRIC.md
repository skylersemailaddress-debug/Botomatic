# Botomatic Enterprise Launch Rubric

Status: Phase 1 locked launch contract
Applies to: Entire Botomatic product surface
Purpose: Freeze the scoring standard for enterprise launch readiness so future audits score against the same criteria, evidence, and validators.

---

## Scoring rules

- Scores are evidence-based, not aspirational.
- A category may not score above its cap if required evidence is missing.
- A category may not score 10/10 unless all required evidence exists and all linked validators pass.
- P0 blockers cap overall launch readiness regardless of strength in other categories.
- “Enterprise launchable” requires all P0 blockers closed.
- “10/10 launch ready” requires all category validators passing and no uncapped critical gaps.

---

## Category rubric

### 1. Product Architecture
Target: 10/10

Required standard:
- Clear control-plane architecture
- Stable stage contracts across intake, compile, planning, execution, validation, and promotion
- Modular adapters and runtime boundaries
- Explicit ownership of state, queueing, execution, and persistence
- No contradictory MVP/scaffold language in release-facing docs

Required evidence:
- `README.md`
- `PRODUCT_SCOPE.md`
- `docs/architecture/*`
- Runtime/server entrypoints
- Queue/worker implementation

Required validators:
- `Validate-Botomatic-Architecture`

Score caps:
- Cap at 7.0 if architecture docs are incomplete
- Cap at 6.5 if runtime boundaries are ambiguous
- Cap at 6.0 if release-facing docs still frame the system as scaffold/MVP only

### 2. Builder Capability
Target: 10/10

Required standard:
- Messy intake is normalized reliably
- Planning quality is consistent and inspectable
- Packetization supports meaningful production work
- Repair/replay supports common failure classes
- Generated outputs are closer to deployable baselines than toy scaffolds

Required evidence:
- Intake contracts
- Planning/packetization implementation
- Repair/replay implementation
- Output quality policy docs
- Golden examples / benchmark cases

Required validators:
- `Validate-Botomatic-BuilderCapability`

Score caps:
- Cap at 7.0 if blueprint depth is narrow
- Cap at 6.5 if repair/replay covers only limited failure paths
- Cap at 6.0 if output quality lacks benchmark evidence

### 3. UI / Operator Control Plane
Target: 10/10

Required standard:
- Real operator UI exists
- Intake, understanding, plan, execution, validation, repair, and promotion are visible and actionable
- Packet/job drilldown exists
- Artifact/diff inspection exists
- Validation/readiness surface exists
- Audit/trace history is operator-readable

Required evidence:
- Frontend app source
- Route map / screen map
- UI contracts to backend APIs
- Screenshots or demo captures
- Accessibility notes

Required validators:
- `Validate-Botomatic-UIReadiness`

Score caps:
- Cap at 4.0 if no real operator UI exists
- Cap at 6.0 if UI exists but lacks execution/repair/readiness visibility
- Cap at 7.0 if UI exists but lacks full artifact/approval/audit flows

### 4. Security and Governance
Target: 10/10

Required standard:
- Enterprise identity support exists
- RBAC exists
- Mutating actions are permissioned
- Risky actions are policy-gated and approval-aware
- Audit logs exist for meaningful actions
- Secrets handling is documented and enforced

Required evidence:
- Auth implementation
- RBAC role matrix
- Policy docs
- Audit log schema / storage
- Approval flow implementation

Required validators:
- `Validate-Botomatic-Security`
- `Validate-Botomatic-Governance`

Score caps:
- Cap at 5.5 if auth is bearer-token only
- Cap at 6.0 if RBAC is missing
- Cap at 6.5 if approvals/policy controls are missing
- Cap at 7.0 if audit logging is incomplete

### 5. Reliability and Recovery
Target: 10/10

Required standard:
- Queue execution is durable
- Retry policy exists by failure type
- Dead-letter handling exists
- Idempotency exists for mutating actions
- Recovery after crash/restart is supported
- Cancellation and replay behavior are defined

Required evidence:
- Queue/worker implementation
- Retry policy docs
- Failure mode docs
- Recovery/replay logic
- Operational test coverage

Required validators:
- `Validate-Botomatic-Reliability`

Score caps:
- Cap at 6.5 if replay exists but is narrow
- Cap at 6.0 if retries/dead-letter handling are missing
- Cap at 6.0 if idempotency is not enforced
- Cap at 7.0 if crash recovery is incomplete

### 6. Observability
Target: 10/10

Required standard:
- Structured logs exist by run/job/packet
- Traceability exists end to end
- Key metrics exist for queue, execution, failures, and latency
- Operators can inspect build history and failure causes
- Alerts or operational hooks exist for critical failures

Required evidence:
- Logging implementation
- Trace IDs / timeline wiring
- Metrics docs
- Operator diagnostics surface
- Alert hooks/integrations

Required validators:
- `Validate-Botomatic-Observability`

Score caps:
- Cap at 6.0 if only basic logs exist
- Cap at 6.5 if traces/metrics are partial
- Cap at 7.0 if no operator diagnostics surface exists

### 7. Validation and Launch Readiness
Target: 10/10

Required standard:
- Launch gates are explicit
- Validation spans code quality, architecture, policy, performance, and product readiness where applicable
- A release evidence bundle can be produced
- Launch pass/fail is computable from validators

Required evidence:
- Validation pipeline implementation
- `VALIDATION_MATRIX.md`
- Release checklist
- Evidence bundle output format

Required validators:
- `Validate-Botomatic-LaunchReadiness`

Score caps:
- Cap at 6.5 if validation exists but is shallow
- Cap at 6.5 if launch pass/fail is manual only
- Cap at 7.0 if evidence bundle generation is missing

### 8. Documentation and Proof
Target: 10/10

Required standard:
- Product scope is explicit
- Supported and unsupported capabilities are documented
- Operators/admins have usable docs
- Architecture and validation docs are kept in repo
- Future auditors can verify claims from repo evidence alone

Required evidence:
- `PRODUCT_SCOPE.md`
- `LAUNCH_BLOCKERS.md`
- `READINESS_SCORECARD.json`
- `VALIDATION_MATRIX.md`
- setup/operator/admin docs

Required validators:
- `Validate-Botomatic-Documentation`

Score caps:
- Cap at 6.0 if scope is ambiguous
- Cap at 6.5 if blockers are not centralized
- Cap at 7.0 if validator mapping is incomplete

---

## Overall launch rules

Overall launch readiness is capped below 8.0 if any P0 blocker remains open.
Overall launch readiness cannot reach 10/10 until:
- all P0 blockers are closed
- all required validators exist
- all required validators pass
- all category evidence is present in-repo
- UI/operator control plane is fully implemented
- security/governance is enterprise-grade

---

## Audit method

Future audits must:
1. Score each category against this rubric
2. Cite evidence for each score
3. Apply score caps when evidence is missing
4. List failing validators
5. State whether P0 blockers are open or closed
6. Refuse 10/10 claims when caps or blockers apply

This file is the source of truth for Botomatic enterprise launch scoring.