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
- Universal-builder launch claim: NOT READY.
- The universal-builder benchmark currently fails strict thresholds, so Botomatic does not claim commercially launch-ready universal output yet.

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
