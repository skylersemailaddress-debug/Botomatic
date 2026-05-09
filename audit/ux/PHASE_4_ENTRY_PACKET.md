# Phase 4 Entry Packet — UX and Non-Technical User Audit

## Purpose

Audit whether Botomatic behaves like a trustworthy, understandable, non-technical-first autonomous builder.

## Phase Goal

Determine whether a non-technical user can reliably move from conversational intent to commercial-grade output without understanding software engineering internals.

## Required Audit Areas

1. conversational onboarding
2. Build Contract UX
3. assumption handling UX
4. approval UX
5. repair-loop UX
6. failure explanation UX
7. deployment/export UX
8. generated-app editing UX
9. preview/source consistency UX
10. advanced-mode containment
11. trust/safety UX
12. release/readiness explanation UX

## Required Questions

1. Can a non-technical user understand what Botomatic is doing?
2. Are assumptions surfaced clearly?
3. Can users accidentally launch broken apps?
4. Are failures explained in plain language?
5. Is advanced mode safely separated from default mode?
6. Does preview truthfully represent exported output?
7. Are repair attempts understandable?
8. Are readiness claims understandable and evidence-backed?
9. Are unsupported requests handled gracefully?
10. Is the UX calm, trustworthy, and professional?

## Required Outputs

```text
audit/ux/UX_FRICTION_AUDIT.md
audit/ux/NONTECHNICAL_USER_FLOW_AUDIT.md
audit/ux/TRUST_AND_FAILURE_HANDLING_AUDIT.md
audit/ux/PREVIEW_TRUTHFULNESS_AUDIT.md
audit/ux/ADVANCED_MODE_BOUNDARY_AUDIT.md
audit/ux/PHASE_4_EXECUTIVE_SUMMARY.md
```

## Required Testing Methods

- Playwright flow replay
- screenshot review
- non-technical-user walkthroughs
- generated-app edit replay
- failure-state review
- unsupported-request review
- accessibility review

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| visual/polish review | Gemini | Playwright screenshots |
| runtime interaction testing | Playwright | Vitest |
| implementation | Codex/Cursor | Claude Opus |
| accessibility | axe-core | Lighthouse |

## Exit Criteria

Phase 4 exits only when:

- non-technical-user friction is classified
- preview truthfulness is reviewed
- advanced-mode boundaries are reviewed
- trust/failure UX is reviewed
- unsupported-request UX is reviewed
- generated-app editing UX is reviewed
