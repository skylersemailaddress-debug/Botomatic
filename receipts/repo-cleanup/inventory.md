# Repo Cleanup Inventory

Generated: 2026-05-02

## Current Branch
- fix/max-power-autonomous-builder-core-no-ui-change

## Dirty File Count
- 1243 paths from `git status --short`

## Open PR Snapshot
- Total open PRs: 660 (top 50 inspected via `gh pr list --state open --limit 50`)
- High-signal PRs:
  - #1230 Orchestrator autonomous approval policy: failing checks (1/3)
  - #1229 Builder forensic single-window measurement: checks passing
  - #1228 Builder forensic live runtime path: checks passing
  - #1227 Builder forensic capability stress harness: checks passing
  - #1223 Chromebook commercial UI runtime clean: failing checks (1/3)
- Low-signal bulk PRs:
  - Many `build/proj_*` packet PRs; likely generated and mostly obsolete for a clean merge path

## Candidate Classification
- Good candidates (preserve content into cleanup branch):
  - #1230 (autonomous approval policy flow)
  - #1229 (single-window forensic measurement)
  - #1228 (real runtime pass harness)
  - #1227 (forensic stress harness)
- Likely obsolete:
  - Most `build/proj_*` packet PRs unless they carry unique source/test logic beyond generated output
- Broken or risky:
  - #1230 until checks green
  - #1223 until checks green and UI-lock verified

## Branches With Unique Work Not In Main
(checked against `origin/main`)
- fix/orchestrator-autonomous-approval-policy
- fix/builder-forensic-single-window-measurement
- fix/builder-forensic-real-runtime-pass
- fix/builder-forensic-capability-stress
- fix/chromebook-commercial-ui-runtime-clean
- fix/max-power-autonomous-builder-core-no-ui-change

## Cleanup Direction
- Build one integration branch from latest main.
- Preserve source/test/harness/compact receipts only.
- Exclude runtime generated apps, screenshot spam, per-run archives, and phase logs.
