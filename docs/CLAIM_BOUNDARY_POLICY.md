# Claim Boundary Policy

## Purpose

This policy defines the rules for what Botomatic may publicly claim versus what remains internal aspiration, representative proof, or future roadmap.

This policy exists to prevent false confidence, misleading launch claims, and unsupported commercial positioning.

## Core Rule

No public-facing capability, launch, security, reliability, deployment, or universal-builder claim may exceed runtime evidence.

## Canonical Priority

If there is disagreement between:

- marketing language
- screenshots
- README language
- validator output
- release evidence
- runtime proof
- MASTER_TRUTH_SPEC.md

then:

1. runtime proof wins
2. release evidence wins
3. validator-backed proof wins
4. MASTER_TRUTH_SPEC.md wins over aspirational language

## 99 Percent Capability Boundary

The phrase:

```text
99% of software
```

is currently treated as an internal north-star aspiration and not a proven commercial claim.

Botomatic may not publicly claim universal or near-universal software generation capability unless:

- statistically meaningful benchmark coverage exists
- multiple software domains are independently proven
- generated apps pass commercial readiness validators
- deployment proof exists
- representative proof is distinguished from exhaustive proof
- unsupported domains fail safely and honestly
- independent review validates the benchmark process

## Generated-App Claim Rules

Generated applications are not considered commercially launch-ready unless:

- build passes
- validation passes
- no-placeholder rules pass
- security and route authorization checks pass
- deployment smoke proof passes
- rollback proof exists
- required approvals are recorded
- release evidence is generated

## Deployment Claim Rules

Botomatic may not claim live deployment proof unless:

- deployment executed against a real environment
- credentials were supplied intentionally
- smoke tests passed
- rollback path was tested
- observability and logs were verified

Dry-run deployment proof alone is insufficient.

## Security Claim Rules

Botomatic may not claim:

- zero leaks
- perfect security
- enterprise-grade isolation
- production-grade auth
- complete sandboxing

unless the supporting runtime and audit evidence exists.

Security claims must always be scoped and evidence-backed.

## Validator Rules

Validators are not trusted solely because they return green status.

A validator is considered launch-critical only when:

- it tests real behavior
- it has negative-path coverage
- it is wired into CI/release gating
- it cannot silently pass on placeholder state
- its evidence output is preserved

## Representative Proof Boundary

Representative proof:

- does not equal exhaustive proof
- does not guarantee universal domain success
- does not imply unsupported domains are safe
- does not imply every generated app is commercially launch-ready

## User Experience Honesty Rules

Botomatic must not:

- fake deployment success
- fake build completion
- fake app health
- fake integration state
- fake generated source synchronization
- hide blockers that materially affect launch readiness

Unknown or incomplete states must be shown honestly.

## Release Promotion Rules

No release stage promotion may occur unless:

- P0 launch blockers are zero
- release evidence is complete
- staging proof exists
- required validators pass
- claim language was reviewed against evidence

## Required Audit Outputs

Every major audit cycle should produce:

```text
what is proven
what is partially proven
what is representative only
what remains aspirational
what is unsupported
what blocks launch
```

## Enforcement

This policy should be enforced by:

- release validators
- commercial launch gates
- CI/CD checks
- readiness scorecards
- audit packets
- release evidence review
- launch decision review
