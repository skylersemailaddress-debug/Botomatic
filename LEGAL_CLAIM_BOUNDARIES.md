# LEGAL_CLAIM_BOUNDARIES

This document defines the allowed claim boundaries for Botomatic communications across internal, beta/commercial-preview, and public-launch contexts.

## Claim tiers and allowed scope

### 1) Internal readiness claims
Allowed when based on current repository truth and current validator status.

Allowed examples:
- "This capability is implementation-present in the current branch/repo and validator-checked where applicable."
- "Readiness is conditional on validators remaining green on current code."

Not allowed at this tier:
- Converting implementation presence into market-ready or live-deployment guarantees.

### 2) Beta/commercial preview claims
Allowed only with explicit caveats that the proof basis is representative unless exhaustive evidence exists.

Allowed examples:
- "Commercial-preview workflows are implemented with validator-backed readiness gates."
- "Representative runtime/generated-output evidence exists for selected domains."

Not allowed at this tier:
- Any statement implying exhaustive proof across all app types, providers, integrations, or blueprint permutations.

### 3) Public launch claims
Allowed only when all critical launch validators are currently passing and the claim maps to the evidence class required by `EVIDENCE_BOUNDARY_POLICY.md`.

Allowed examples:
- "Launch-readiness claims are evidence-bound and revoked when critical validation fails."

Not allowed at this tier:
- "Universal" or "all" readiness claims without exhaustive-domain proof.

## Evidence-bound language requirements

Required language patterns:
- Use "evidence-backed", "validator-backed", "representative", "current codebase", "subject to caveats".
- Tie claims to current status (e.g., "while critical validators pass on current code").
- Separate deployment readiness from live deployment execution.

## Prohibited language

The following patterns are prohibited unless exhaustive evidence exists and is current:
- "all", "always", "guaranteed", "fully replaces", "one-click proven everywhere", "no human review required".
- Any claim that implies live-provider production proof when only dry-run/readiness proof exists.

## Required caveats

All external-facing readiness and quality claims must include the following caveats where relevant:
1. Representative evidence is not exhaustive-domain proof.
2. Deployment readiness is not live deployment proof.
3. Generated-output proof is not universal proof for every app permutation.
4. Local/runtime execution proof is not equivalent to production-provider proof.
5. Claim validity is conditional on current code + current validator outcomes.

## Representative proof vs exhaustive proof

- Representative proof: Evidence demonstrates behavior across selected required domains/scenarios.
- Exhaustive proof: Evidence demonstrates behavior across the full declared scope (all supported domains, permutations, and critical pathways).

Representative proof may support "representative" claims only. Exhaustive-language claims require exhaustive proof.

## Deployment readiness vs live deployment proof

- Deployment readiness: Contracts, checklists, adapters, approval gates, smoke-test plans, and rollback plans are implemented and validated.
- Live deployment proof: Real provider APIs and real credentials executed a deployment and passed provider-specific smoke tests in an actual target environment.

No readiness-only evidence may be marketed as live-deployment success.

## Generated-output proof vs all-app universal proof

- Generated-output proof: Produced artifacts pass defined validation/readiness checks for selected domains.
- All-app universal proof: Exhaustive evidence across every declared app type, permutation, and integration path.

Generated-output evidence supports only representative scope unless exhaustive evidence exists.

## Local/runtime proof vs production-provider proof

- Local/runtime proof: Command/runtime evidence from local or controlled execution environments.
- Production-provider proof: Evidence from real cloud/provider deployment and operations using real credentials, approvals, and smoke tests.

Local/runtime success cannot be claimed as production-provider success.
