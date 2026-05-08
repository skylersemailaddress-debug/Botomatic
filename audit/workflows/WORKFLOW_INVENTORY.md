# Workflow Inventory

## Purpose

Inventory and classify GitHub Actions workflows as part of Phase 1 baseline repo truth audit.

## Current Workflow Files

| Workflow | File | Trigger | Classification | Status |
|---|---|---|---|---|
| Botomatic PR Gates | `.github/workflows/botomatic-pr-gates.yml` | pull_request to main | PR gate | keep, revise in Phase 12 |
| Full Build Path Proof | `.github/workflows/full-build-path-proof.yml` | manual workflow_dispatch | runtime proof | keep, migrate to commercial proof tier later |
| Phase 1 Baseline Truth Audit | `.github/workflows/phase-1-baseline-truth-audit.yml` | manual and PR path-filtered | baseline audit | keep during Phase 1; may retire after Phase 1 close |

## Observations

The repository source currently exposes only three workflow definition files. The large number of visible Actions runs is historical run accumulation, not evidence of thousands of active workflow files.

## Cleanup Rule

Do not manually delete workflow history. Reduce future noise by controlling workflow files, triggers, and naming.

## Canonical Workflow Target

Target long-term workflow architecture:

| Canonical Workflow | Purpose | Phase |
|---|---|---|
| `ci.yml` | normal PR baseline CI | Phase 12 |
| `security.yml` | static security, secrets, dependency scanning | Phase 8 / 12 |
| `commercial-proof.yml` | commercial readiness proof tier | Phase 9 / 10 / 12 |
| `max-power-proof.yml` | 99% and domain coverage proof tier | Phase 14 |
| `staging-smoke.yml` | real staging smoke and rollback proof | Phase 13 |
| `release-candidate.yml` | final release candidate packet | Phase 15 |

## Phase 1 Decision

Keep the current workflow set while Phase 1 is active.

Required Phase 1 cleanup:

- keep `phase-1-baseline-truth-audit.yml` until Phase 1 closes
- keep `botomatic-pr-gates.yml` as the current PR gate until Phase 12 replaces it
- keep `full-build-path-proof.yml` as a manual runtime proof until Phase 12/13 split it into commercial/staging proof workflows

## Tool / Model Ownership

| Work | Primary Tool | Secondary Tool |
|---|---|---|
| workflow architecture | GPT-5.5 | GitHub Actions docs |
| workflow implementation | Codex / Cursor | GPT-5.5 review |
| future security workflow | Semgrep / CodeQL / Gitleaks | GPT-5.5 |
| release gating | GitHub Actions | branch protection |

## Phase 1 Exit Standard

Workflow cleanup is Phase 1-complete when:

- active workflow definitions are inventoried
- noisy history is distinguished from active workflow files
- canonical future workflow architecture is documented
- no unsafe workflow deletion is required before Phase 2
