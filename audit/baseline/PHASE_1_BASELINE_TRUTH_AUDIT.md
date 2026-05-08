# Phase 1 — Baseline Repo Truth Audit

## Purpose

Phase 1 establishes the actual operational truth of the Botomatic repository before any major remediation or architectural rewrite work begins.

This phase exists to answer:

- what currently works
- what currently fails
- what is missing
- what is only represented
- what is actually runtime-proven
- what blocks commercial launch
- what blocks Google-level reliability
- what blocks non-technical-user-first operation
- what blocks enterprise trust

No large feature expansion or broad refactor work should begin until this baseline is complete.

---

# Audit Principles

## 1. Runtime truth over aspiration

Green documentation without runtime proof does not count as readiness.

## 2. Validators themselves are audited

A passing validator is not automatically trusted.

## 3. Representative proof is not exhaustive proof

Example scenarios do not imply universal domain reliability.

## 4. Commercial claims require evidence

No launch/commercial/security/deployment claim is accepted without supporting evidence.

## 5. Non-technical-user-first is mandatory

Botomatic should not require engineering knowledge for the default successful path.

---

# Required Baseline Command Suite

The complete baseline suite is:

```bash
npm ci
npm run deps:sanity
npm run lint
npm run typecheck
npm run build
npm run test
npm run validate:all
npm run proof:all
npm run beta:readiness
npm run validate:commercial-launch
```

Outputs must be preserved.

---

# Required Audit Outputs

Phase 1 must produce:

```text
audit/baseline/BASELINE_RESULTS.md
audit/baseline/FAILED_GATES.md
audit/baseline/MISSING_SCRIPTS.md
audit/blockers/P0_P1_BLOCKERS.md
audit/validators/VALIDATOR_TRUTH_AUDIT.md
audit/architecture/INITIAL_ARCHITECTURE_NOTES.md
audit/security/INITIAL_SECURITY_NOTES.md
audit/ux/NONTECHNICAL_USER_FRICTION_NOTES.md
```

---

# Google-Level Audit Model Assignment

## GPT-5.5

Primary responsibility:

- architecture reasoning
- validator truth analysis
- failure-mode reasoning
- security reasoning
- launch-blocker classification
- commercial-readiness analysis
- claim-boundary enforcement
- orchestration analysis
- non-technical-user UX evaluation

GPT-5.5 is the primary systems auditor.

---

## Claude Opus

Primary responsibility:

- large-scale repetitive cleanup
- validator rewrites
- repo-wide refactors
- typing cleanup
- repetitive architectural normalization

Claude Opus is the primary large-refactor engine.

---

## Codex / Cursor Agents

Primary responsibility:

- command execution
- fixing failing tests
- CI/CD wiring
- implementation patches
- validator implementation
- automation loops
- structured patch generation

Codex/Cursor are the primary execution workers.

---

## Gemini

Primary responsibility:

- UI polish review
- onboarding clarity review
- visual consistency review
- screenshot UX analysis
- product interaction critique

Gemini is the primary visual-product reviewer.

---

# Required Tooling

## Security

- Semgrep
- CodeQL
- Snyk
- npm audit
- Gitleaks
- TruffleHog
- Trivy

## Reliability

- Playwright
- Vitest/Jest
- k6
- custom failure-mode harnesses

## Architecture

- dependency-cruiser
- madge
- ts-prune

## Accessibility and UX

- axe-core
- Lighthouse
- Playwright screenshot tests

## Observability

- OpenTelemetry
- Sentry
- Grafana/Loki

---

# Initial Audit Objectives

The first baseline pass should determine:

1. Whether root commands pass.
2. Whether validators are trustworthy.
3. Whether launch gates are enforceable.
4. Whether tenant isolation exists and is proven.
5. Whether auth and route protection are consistent.
6. Whether orchestration is durable.
7. Whether restart/resume is real.
8. Whether generated-app launch claims are evidence-backed.
9. Whether live preview/source synchronization is real.
10. Whether the default user path is genuinely non-technical.
11. Whether deployment and rollback are runtime-proven.
12. Whether commercial/billing foundations exist.

---

# Exit Criteria

Phase 1 completes only when:

- baseline results are recorded
- every failing gate is classified
- every missing script is tracked
- P0/P1 launch blockers are documented
- validator truth gaps are documented
- architecture and orchestration weaknesses are documented
- no unsupported launch claim remains untracked

At Phase 1 completion, Botomatic should have a truthful engineering baseline suitable for Google-level remediation planning.