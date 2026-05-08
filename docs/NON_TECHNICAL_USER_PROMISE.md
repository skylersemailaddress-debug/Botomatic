# Non-Technical User Promise

## Purpose

Define the default user experience Botomatic must protect while becoming a commercial autonomous software builder.

## Promise

A non-technical user should be able to describe the software they want in plain language, approve a plain-English Build Contract, watch progress, request changes conversationally or visually, and receive validator-proven export or launch options without being forced to understand engineering internals.

## Default User Path

```text
user describes app
-> Botomatic extracts intent
-> Botomatic asks only necessary plain-English questions
-> Botomatic proposes safe assumptions
-> Botomatic generates a Build Contract
-> user approves
-> Botomatic builds
-> Botomatic previews progress
-> Botomatic validates and repairs
-> Botomatic explains blockers plainly
-> Botomatic enables export or launch only when proof supports it
```

## User Should Not Need To Understand

- repositories
- branches
- package managers
- CI/CD
- validators
- environment variables
- secrets
- logs
- cloud provider details
- rollback mechanics
- database migrations
- deployment internals

Advanced controls may exist, but they must remain optional.

## Required UX Standards

- no fake success states
- no fake deployment state
- no fake readiness percentages
- no hidden launch blockers
- no technical-only error messages on the default path
- no forced mode selection between simple/pro unless necessary
- no export or launch claim without proof

## Tool / Model Ownership

| Work | Primary Tool | Secondary Tool |
|---|---|---|
| UX promise and interaction logic | GPT-5.5 | Gemini |
| visual polish review | Gemini | Playwright screenshots |
| implementation | Codex / Cursor | Claude Opus |
| accessibility validation | axe-core | Lighthouse |
| E2E happy path | Playwright | GPT-5.5 review |

## Exit Standard

This promise is satisfied only when a non-technical user can complete the happy path without opening advanced controls, reading logs, touching code, or understanding deployment mechanics.