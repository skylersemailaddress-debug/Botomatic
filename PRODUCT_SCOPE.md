# Botomatic Product Scope

Status: Phase 1 definition

---

## Product definition

Botomatic is an enterprise autobuilder control plane that:

- accepts messy human input
- converts it into structured understanding
- generates a build plan
- executes packetized work via a queue/worker system
- produces repository-level artifacts
- validates output quality and readiness
- enables governed promotion and release

---

## Supported capabilities (current)

- intake and compile
- plan generation
- packet/job execution
- queue/worker system
- GitHub integration for branch/commit/PR
- basic replay for certain failure cases
- basic validation hook

---

## Not yet complete (blocks 10/10)

- full operator UI system
- enterprise auth and RBAC
- governance/approval system
- full observability layer
- deep launch-readiness gating
- expanded builder capability and blueprint depth

---

## Product promise (target state)

Messy input → structured understanding → plan → execution → artifacts → validation → approval → deployment-ready output

---

## Release rule

Botomatic may only be considered enterprise launchable when:

- all P0 blockers in LAUNCH_BLOCKERS.md are closed
- all validators in VALIDATION_MATRIX.md pass
- all categories meet rubric requirements

This file defines the intended product surface and must remain aligned with actual implementation.
