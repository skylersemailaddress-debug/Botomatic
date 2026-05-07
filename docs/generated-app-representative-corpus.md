# Generated App Representative Corpus (GEN-006)

## Scope

The representative corpus adds cross-domain generated app fixtures for static validation using the GEN-005 corpus harness.

This corpus is representative, not exhaustive, and it does not provide runtime, deployment, or production telemetry proof.

## Fixture inventory

Manifest path:

- `fixtures/generated-app-corpus/representative/manifest.json`

Representative positive fixture IDs:

- `webSaasDashboard`
- `bookingApp`
- `ecommerceStore`
- `marketplace`
- `customerPortal`
- `apiService`
- `botAgentConsole`
- `mobileAppShell`
- `gameLandingPage`
- `consumerApp`
- `aiAssistant`
- `fileHeavyApp`
- `adminDashboard`

Controlled negative fixture ID:

- `negativePlaceholderBlocked` (isolated under `negative/` and expected `blocked`)

## Why these fixtures are representative but not exhaustive

- They cover multiple generated app domains (dashboard SaaS, booking, ecommerce, marketplace, customer portal, API service, agent console, mobile shell, landing page, consumer app, ai assistant, file-heavy app, admin dashboard).
- They include static artifact boundaries used by GEN-004 gates: entrypoints, installability manifests, legal claim language, and readiness notes.
- They do not cover all runtime architectures, data-plane combinations, or deployment providers.

## GEN-005 harness evaluation flow

The corpus uses `evaluateGeneratedAppCorpus` from `packages/validation/src/generatedApp/corpusHarness.ts`.

Per case, the harness evaluates:

1. no-placeholder findings (GEN-003),
2. commercial readiness gates (GEN-004),
3. bounded launch packet caveats and claim boundary language.

Expected statuses in this corpus:

- Most fixtures: `candidate_ready`
- One intentionally partial fixture: `preview_ready` (`mobileAppShell`, missing build/test evidence)
- One controlled negative fixture: `blocked` (`negativePlaceholderBlocked`)

## Readiness boundary

`candidate_ready` is not launch-ready.

`candidate_ready` indicates static readiness evidence only and cannot be used for public launch or production claims without runtime validation, deployment smoke evidence, and legal claim-boundary review.

## Known gaps

- No live runtime execution proof in this corpus.
- No deployment smoke proof in this corpus.
- No integration uptime/error-budget telemetry in this corpus.
- No production incident rehearsal evidence in this corpus.

## Next steps for runtime/deployment proof

1. Run runtime validation suites for each generated app type in controlled environments.
2. Execute deployment smoke checks and rollback drills per fixture domain.
3. Attach legal/commercial claim-boundary evidence before external readiness claims.
4. Promote only evidence-backed statuses in release communications.

## Explicit legal and evidence boundary phrases

- not launch-ready
- not production-ready
- static corpus fixture only
- no live deployment proof
- candidate_ready is not launch-ready
