# Botomatic

Botomatic is a chat-first universal app and website builder running on a governed autobuilder control plane.

## Product definition

Botomatic is being built to:
- accept messy human input in chat
- organize that input into a structured commercial product spec
- plan and execute packetized implementation work through controlled runtime paths
- enforce build-contract and governance gates before risky transitions
- validate generated output against enterprise launch criteria and no-placeholder rules
- refuse launch-ready claims when critical validators fail

See `PRODUCT_SCOPE.md`, `UNIVERSAL_BUILDER_TARGET.md`, and `CHAT_FIRST_PRODUCT_SPEC.md` for the canonical product definition.

## Operator quick start (Phase A bootstrap)

### Requirements
- Node.js (LTS recommended)
- npm

### Install

```bash
npm install
```

### Start control plane (API + UI)

```bash
npm run control-plane:dev
```

Expected:
- API boots successfully
- Control-plane UI starts (Next.js dev server)

### Validate

```bash
npm run validate:all
```

## Current implemented surface

The current repository includes:
- durable control-plane backend: intake/compile/plan/execute/validation/replay/governance/audit/deployment state
- chat-first operator routing endpoint with deterministic next-stage transitions
- spec-engine package for completeness scoring, clarification planning, autonomy policy, recommendations, assumption ledger, and build contract generation
- blueprint registry coverage for common commercial app categories
- generated-app validator set including no-placeholder and commercial-readiness checks
- benchmark suite scaffold with 31 scenario cases

See `READINESS_SCORECARD.json` for current implementation vs remaining gaps.

## Launch program

Botomatic is governed by a locked enterprise launch contract in this repository:
- `ENTERPRISE_LAUNCH_RUBRIC.md`
- `LAUNCH_BLOCKERS.md`
- `READINESS_SCORECARD.json`
- `VALIDATION_MATRIX.md`
- `PRODUCT_SCOPE.md`

## Current launch status

- Enterprise control-plane gate program: previously closed by proof in this repo's historical gate model.
- Universal-builder launch gates satisfied: benchmark, runtime proof harnesses, and validator checks pass with strict thresholds and proof-content enforcement.
- Strict benchmark claim basis: 31 cases, averageScoreOutOf10=10, universalScoreOutOf10=10, criticalFailures=0, launchablePass=true, universalPass=true.
- Generated-output evidence posture: greenfield plus required multi-domain runtime harnesses prove direct emitted representative app file trees, emitted-file validation, and no-placeholder scans across `web_saas_app`, `marketing_website`, `api_service`, `mobile_app`, `bot`, `ai_agent`, `game`, and `dirty_repo_completion`.
- Runnable-output evidence posture: required domain command matrix now executes or truthfully classifies install/build/test/lint-typecheck/deploy-validation commands with machine-readable logs and per-domain runnable readiness status. Evidence: `release-evidence/runtime/domain_runtime_command_execution_proof.json`, `release-evidence/runtime/logs/`, `Validate-Botomatic-DomainRuntimeCommandExecutionReadiness`.
- Caveat: this is representative multi-domain emitted-file proof and should not be generalized as exhaustive universal full-production emission for every blueprint permutation, integration path, or deployment environment without additional emitted runtime evidence.
- Caveat: runnable-output proof demonstrates local command execution readiness for representative emitted domain trees; it is not an exhaustive claim of production deployment success across all infrastructure, integrations, or environment-specific release paths.
- Live deployment execution readiness posture: execution-layer deployment contracts, approval requests, credential bindings, provider adapters, pre-deploy checklists, blocked execution plans, smoke-test plans, rollback plans, and audit event contracts are proof-backed across required domains.
- Secrets and credentials posture: metadata-only secret references and provider/environment credential profiles are supported across Vercel, Supabase, GitHub, OpenAI, Anthropic, Stripe, Twilio, SendGrid, Roblox, Steam, and generic HTTP APIs with redacted audit events and deployment preflight secret gating.
- Autonomous complex build orchestration posture: large uploaded specs/repo zips are ingested into milestone-gated autonomous execution plans with checkpoint/resume, autonomous low/medium-risk repair continuation, and high-risk human escalation policy.
- First-run and What's Next posture: control-plane onboarding includes build-from-idea, spec-zip upload, dirty-repo upload, key-configuration prompt, local launch path, and deployment preparation actions.
- Security Center posture: threat model, RBAC matrix, data privacy posture, dependency-risk scan surface, supply-chain checks, and security-focused audit log are available in control plane.
- Domain readiness posture: per-domain quality scorecards are generated with strict readiness thresholds and represented as non-exhaustive readiness evidence.
- Eval suite posture: runtime eval coverage includes messy prompts, giant specs, dirty repos, games, mobile, bots, AI agents, and decide-for-me prompt paths.
- Fast validation posture: content-hash validator cache is available via `npm run -s validate:fast`, `npm run -s validate:changed`, `npm run -s proof:fast`, and `npm run -s cache:clear`.
- Caveat: live deployment remains blocked by default in this repository proof pass; no live provider deployment was executed, no real provider APIs were called, and no real secrets were used. Actual live deployment requires explicit user approval and user-supplied credentials at execution time.
- Caveat: secret references are stored as metadata only (`secret://` URI + fingerprint) and real secret values are never committed to this repository.
- Caveat: autonomous complex build evidence is readiness proof for milestone-gated orchestration; it is not an exhaustive claim that every possible complex system spec is fully live-deployed by one pass.
- Universal-builder launch posture remains evidence-bound: claims are valid only while `npm run -s validate:all` and proof commands remain passing on current repository truth.

## Principles

- Autobuilder is the governing control plane
- chat is the primary control surface (no mode buttons)
- contracts first, implementation second
- autonomy must remain bounded and inspectable
- execution must preserve evidence and readiness state
- launch claims must be evidence-backed
- no placeholders, fake integrations, fake auth, or scaffold-only production paths

## Audit rule

Future audits should score Botomatic against the in-repo launch contract rather than against shifting or implied standards.
