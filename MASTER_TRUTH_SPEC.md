# MASTER_TRUTH_SPEC.md

## Scope statement
This document is the canonical master truth for Botomatic's max-power autonomous builder target. It consolidates product, legal, and validator truth already distributed across repository documentation and must be used as the primary reference for audits and build-gap execution.

## Release-candidate foundation lock vs max-power completion
RELEASE-002 locks release-candidate foundation evidence only. It does not assert max-power universal builder completion, exhaustive domain proof, or universal production-launchability. Release-candidate foundation readiness is distinct from full max-power product completion.

## Chat-first control law
Botomatic is chat-first. Intake, planning, build intent, risk handling, and execution authorization are controlled through the conversational command surface.

## Route posture and mode policy
There is no visible user-forced Vibe/Pro mode-toggle workflow. Vibe and Pro are route presentations and internal operational postures, not explicit mode choices forced onto users through a global toggle.

## Screenshot-derived Vibe UI truth
Vibe truth is a light, purple-accented, chat-first cockpit with:
- sidebar navigation
- chat timeline
- editable live preview
- build map
- live preview surface
- app health
- what's next
- recent activity
- one-click launch controls

## Screenshot-derived Pro UI truth
Pro truth is a light technical command center with:
- project, branch, and environment selectors
- build pipeline
- code changes
- live app view
- services
- database schema
- tests
- terminal and logs
- AI copilot
- recent commits
- status bar

## Input/control parity
Voice and keyboard commands must map through the same command/action system so intent, authorization, and execution semantics stay aligned.

## Canonical workflow
The canonical flow is:
brainstorm/intake -> spec extraction -> clarification -> recommendation -> assumption ledger -> Build Contract -> build -> validate -> repair/deploy/export.

A Build Contract is required before execution.

## Risk-tier autonomy policy
- Low-risk gaps may be filled autonomously and recorded in the assumption ledger.
- Medium-risk gaps may be recommended and accepted before continuation.
- High-risk gaps must be explicitly asked and approved before continuation.
- Botomatic must never silently decide payments, legal/compliance choices, auth/security posture, user permissions, data deletion/retention behavior, external API costs, public/private visibility, or regulated workflow decisions.

## Generated-app commercial readiness requirements
Generated apps are not launch-ready by default. Commercial readiness requires validator-backed quality, security, legal-boundary, and deployment-governance checks.

## No-placeholder/fake-path requirements
No placeholder implementation or fake integration path may be used to support readiness, launch, or commercial claims.

## Domain coverage target (north-star target, not completion claim)
Botomatic's max-power target spans:
- websites
- SaaS/web apps
- mobile apps
- AI apps/agents
- dirty repo repair
- Roblox-style games
- Steam/desktop games
- complex enterprise apps like Nexus

## Claim boundaries
- 99% capability language remains an internal north-star aspiration until independently proven.
- Release-candidate foundation ready is not max-power completion.
- Representative proof is not exhaustive proof.
- Generated apps are not launch-ready without validation.
- Live deployment requires credentials, approval, smoke proof, and rollback proof.
- This spec does not claim live deployment is proven.
- This spec does not claim zero leaks are proven.

## Next audit process
All future max-power audits must compare repository implementation against `MASTER_TRUTH_SPEC.md` first, then evaluate supporting docs, validators, and runtime evidence for alignment.
