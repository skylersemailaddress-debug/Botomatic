# Botomatic Google-Level Target

## Purpose

This document defines the target state for Botomatic as a commercial autonomous software builder. It is a Phase 0 alignment artifact and does not claim the repository has already reached this target.

`MASTER_TRUTH_SPEC.md` remains the canonical product truth. This document translates that truth into an execution target for audits, remediation packets, validation, and release decisions.

## Target Statement

Botomatic should become a chat-first autonomous software builder where a non-technical user can describe what they want in plain language, approve a plain-English Build Contract, watch a live preview evolve, request changes conversationally or visually, and receive only validator-proven release/export options.

The user should not be required to understand repositories, branches, package managers, deployments, CI/CD, tests, environment variables, logs, secrets, cloud providers, or rollback mechanics unless they explicitly chooses advanced controls.

## Product Standard

Botomatic should feel like a polished consumer-grade product while operating with enterprise-grade engineering discipline.

The default user journey is:

```text
user describes the software
-> Botomatic extracts intent
-> Botomatic asks only necessary risk questions
-> Botomatic records safe assumptions
-> Botomatic generates a plain-English Build Contract
-> user approves
-> Botomatic builds in a governed workspace
-> live preview updates
-> Botomatic validates and repairs
-> Botomatic explains blockers plainly
-> Botomatic enables export or launch only when evidence supports it
```

## Engineering Standard

Botomatic should be structured as a reliable autonomous production system, not a demo code generator. The architecture should preserve clear boundaries between:

- conversational intake
- product/spec extraction
- risk classification
- assumption ledger
- Build Contract generation
- autonomous planning
- execution
- generated-app workspace management
- live preview and source synchronization
- validation
- repair loops
- claim gating
- release evidence
- deployment/export
- observability
- billing and entitlements
- tenant isolation

## Required System Properties

Botomatic must be:

- chat-first by default
- non-technical-user safe
- fail-closed for launch/commercial claims
- validator-backed
- tenant-scoped
- secure-by-default
- durable across restarts
- observable in staging and production
- recoverable from partial failures
- explicit about assumptions and approvals
- honest about unsupported domains or missing proof

## Non-Goals

The target is not:

- forcing users into Vibe or Pro modes
- exposing technical controls as mandatory workflow
- claiming universal software generation before proof exists
- treating representative examples as exhaustive proof
- allowing static docs to stand in for runtime evidence
- shipping placeholder integrations as commercial readiness
- launching without smoke proof and rollback proof

## Completion Definition

Botomatic reaches the target only when all of the following are true:

1. root baseline gates pass
2. launch-critical validators have negative-path tests
3. non-technical user happy path is proven end-to-end
4. Build Contract gating is mandatory before execution
5. live visual edits sync to real source before export or launch claims
6. generated-app commercial readiness is validator-backed
7. tenant isolation and route authorization are proven
8. secrets and credentials are protected and scanned
9. durable orchestration, retry, restart/resume, and idempotency are proven
10. staging deployment, smoke test, rollback, and observability proof exist
11. billing, entitlements, support/admin, data export, and data deletion are commercially ready
12. every public claim is supported by release evidence

## Execution Discipline

All future Google-level remediation packets should follow this order:

```text
baseline truth
-> audit
-> blocker classification
-> targeted remediation
-> validation hardening
-> release evidence
-> claim-boundary update
```

No packet should expand the public promise unless the new promise is backed by runtime evidence.