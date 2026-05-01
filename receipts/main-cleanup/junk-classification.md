# Junk Candidate Classification

## DELETE_JUNK

- test-results/ (local Playwright run output; untracked generated output)
- apps/control-plane/.next/ (local Next.js build cache)
- release-evidence/runtime/intake/ (local generated intake output directory)
- *.old cache fragments (temporary webpack/pack artifacts)

## ADD_TO_GITIGNORE

- node_modules/
- .next/
- dist/
- build/
- coverage/
- .turbo/
- .cache/
- .playwright/
- test-results/
- playwright-report/
- .env
- .env.local
- .env.*.local
- *.log
- *.tmp
- *.bak
- *.backup
- .DS_Store

## KEEP_SOURCE

- scripts/beta-simulation.mjs
- tests/e2e/beta-owner-launch.spec.ts
- packages/validation/src/runtime/proof*.ts additions
- package.json and runtime/source changes already in progress

## KEEP_PROOF

- receipts/beta-simulation/*
- release-evidence/runtime/*
- release-evidence/generated-apps/<canonical domains>/*

## KEEP_DOC

- launch/readiness/spec docs under repository root and docs/

## KEPT_DESPITE_UNCERTAINTY

- release-evidence/generated-apps/proj_* trees were initially removed, then restored because they are tracked evidence artifacts and not safe to delete without explicit archival policy.
