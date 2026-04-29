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
Voice is speech-to-chat input, not a separate product capability.
Voice does not create a separate voice mode or separate voice-only command router.
Voice and keyboard commands must map through the same command/action system so intent, authorization, and execution semantics stay aligned.
For visual UI building, spoken edit requests route through the same live UI edit command parser and pipeline as typed chat requests.

## Live visual UI builder truth
The live visual UI builder is a core Botomatic requirement.
Every visible UI element in a generated app must be editable by chat command.
Typed and spoken edit requests must use the same chat/edit pipeline.
The preview must update live in real time when edits are applied.
Edits must apply to an actual generated UI model, not a fake static mock.
Visual edits must sync back to generated source files before export or launch claims.

Supported edit classes include:
- add
- remove
- move
- resize
- duplicate
- replace
- rewrite text
- restyle
- retheme
- add page
- remove page
- change layout
- change responsive behavior
- bind data
- bind actions
- connect forms

The system must support selection/inspect mode.
The system must resolve natural references like "this", "that card", "the hero", and "the booking form".
Undo/redo and diff preview are required for safe editing.
Invalid edits must fail safely.
Visual edits must preserve accessibility, responsiveness, and no-placeholder/fake-path requirements.

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
