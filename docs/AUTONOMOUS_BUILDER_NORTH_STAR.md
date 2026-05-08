# Autonomous Builder North Star

## Objective

Botomatic should evolve into a trustworthy autonomous software production system that allows users to create, validate, repair, and deploy commercial software primarily through conversation and guided approvals.

## North-Star Principles

### 1. Conversation First

The default interface is conversational.

Users should be able to:

- describe intent
- upload references
- approve assumptions
- request edits
- ask questions
- review blockers
- launch software

without needing to understand software engineering mechanics.

### 2. Build Contracts Before Execution

No significant autonomous build should begin without:

- a structured Build Contract
- assumption tracking
- risk classification
- validator requirements
- explicit approval for high-risk actions

### 3. Evidence Before Claims

All launch, readiness, deployment, and capability claims must be evidence-backed.

No public-facing 99% capability claim may exist without:

- benchmark evidence
- domain coverage evidence
- deployment proof
- validator proof
- independent validation

### 4. Durable Execution

Botomatic should behave like a production system, not a fragile demo.

Required properties:

- resumable jobs
- durable orchestration
- idempotency
- failure recovery
- repair loops
- rollback capability
- tenant isolation
- audit trail
- evidence ledger

### 5. Safe Autonomy

Botomatic should:

- make safe assumptions automatically
- request approval for risky actions
- refuse unsafe or unsupported operations
- explain blockers plainly
- prevent false-success states

### 6. Unified Build Surface

Chat edits, visual edits, preview edits, and direct source edits should converge into one underlying execution pipeline.

Preview must never diverge from source.

### 7. Commercial Readiness

Generated software should be launch-gated.

Commercial readiness requires:

- build proof
- validator proof
- accessibility proof
- security proof
- deployment proof
- rollback proof
- tenant isolation proof
- commercial support readiness

## Google-Level Interpretation

Google-level does not mean infinite capability.

It means:

- clean architecture
- strong boundaries
- durable systems
- trustworthy execution
- evidence-backed readiness
- high-quality UX
- graceful failure handling
- scalable operational design
- strong validation culture
- polished non-technical user experience

## Tool / Model Ownership

| Work | Primary Tool | Secondary Tool |
|---|---|---|
| architecture strategy | GPT-5.5 | Claude Opus |
| repo-wide implementation | Codex / Cursor | Claude Opus |
| repetitive large refactors | Claude Opus | Codex |
| UX/polish review | Gemini | GPT-5.5 |
| validator hardening | GPT-5.5 + Codex | StrykerJS |
| security review | GPT-5.5 | Semgrep / CodeQL |
| E2E validation | Playwright | Vitest |
| observability | OpenTelemetry | Sentry |

## Success Condition

Botomatic succeeds when:

- non-technical users can reliably build commercial software
- unsupported requests fail gracefully and honestly
- generated apps are evidence-gated
- autonomy is safe and observable
- public claims remain aligned to proof
- the system remains maintainable at scale
