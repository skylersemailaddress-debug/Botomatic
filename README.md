# Botomatic

Botomatic is the Autobuilder control plane for converting messy human input into governed, packetized execution that produces repository-level artifacts, validation results, and release decisions.

## Product definition

Botomatic is being built as an enterprise autobuilder control plane that:
- accepts messy human input
- converts it into structured understanding
- generates a build plan
- executes packetized work through controlled runtime paths
- produces repository-level artifacts through external adapters
- validates output quality and readiness
- supports governed promotion toward launchable output

See `PRODUCT_SCOPE.md` for the canonical product definition.

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

The current repository includes a meaningful control-plane backend with:
- intake and compile paths
- plan generation
- queue and worker based packet execution
- GitHub branch / commit / pull request lifecycle support
- basic validation hooks
- basic replay support for selected failure paths

See `READINESS_SCORECARD.json` for the current baseline assessment.

## Launch program

Botomatic is governed by a locked enterprise launch contract in this repository:
- `ENTERPRISE_LAUNCH_RUBRIC.md`
- `LAUNCH_BLOCKERS.md`
- `READINESS_SCORECARD.json`
- `VALIDATION_MATRIX.md`
- `PRODUCT_SCOPE.md`

## Current launch status

Botomatic is not yet at enterprise launch readiness.

## Principles

- Autobuilder is the governing control plane
- contracts first, implementation second
- autonomy must remain bounded and inspectable
- execution must preserve evidence and readiness state
- launch claims must be evidence-backed

## Audit rule

Future audits should score Botomatic against the in-repo launch contract rather than against shifting or implied standards.
