# Botomatic Product Scope

Status: Universal-builder transition in progress

---

## Product definition

Botomatic is a chat-first universal app and website builder backed by an enterprise-grade autobuilder control plane.

It must:
- accept messy user input and file dumps
- produce a structured commercial product spec
- ask clarifying questions only where risk/ambiguity requires
- make low-risk defaults explicit in an assumption ledger
- block planning/execution until build-contract gates are satisfied
- validate generated app readiness and fail closed on placeholder/fake production paths

---

## Supported capabilities (current)

- chat-first operator routing via `/operator/send`
- intake + file ingestion + compile with spec analysis
- spec completeness scoring, clarification planning, recommendation engine, assumption ledger, build contract generation
- plan generation and packet/job execution with queue/worker
- governance, audit, deployment state, and replay controls
- generated-app validator set and benchmark runtime tooling

---

## Not yet complete (blocks universal launch claim)

- universal-builder benchmark score/critical-fail posture does not yet meet launch threshold
- generated-app output quality needs stronger proof beyond static benchmark simulation
- readiness/launch docs still include legacy enterprise-closure posture and are being reconciled
- additional runtime validator depth is required before claiming 99 percent coverage

---

## Product promise (target state)

Messy input -> complete commercial spec -> locked build contract -> governed execution -> validator-proven launch decision

---

## Release rule

Botomatic may only claim commercially launch-ready universal output when:

- benchmark and validator thresholds are met
- no critical validator failures remain
- no placeholder/fake production paths are present
- build contract gates and high-risk approvals are satisfied
- repo truth files remain consistent with evidence

This file defines the intended product surface and must remain aligned with actual implementation.
