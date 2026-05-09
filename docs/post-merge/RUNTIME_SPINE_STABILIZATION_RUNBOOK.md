# Runtime Spine Post-Merge Stabilization Runbook

## Context

PR #1871 merged the runtime-spine architecture and governance foundation into `main`.

Merge commit:

```text
eb6fe478e848fff3554f40dbf1fc59734179c845
```

## Current External Status

```text
Railway / unique-gratitude - Botomatic-etmt: pending
Vercel / botomatic-uis: failing
Vercel / botomatic-ui: failing
Vercel / botomatic-control-plane-85qx: failing
Vercel / botomatic-control-plane: failing
```

## Stabilization Priority Order

1. Vercel environment parity audit
2. Runtime-spine disabled-state verification
3. Root install/typecheck/test validation
4. Runtime-spine proof validation
5. Railway deployment result confirmation
6. Deployment health verification

## Runtime-Spine Safety State

Runtime-spine must remain disabled until stabilization completes.

Expected defaults:

```text
runtimeSpineEnabled=false
sandboxExecutionEnabled=false
deploymentExecutionEnabled=false
autoscalingEnabled=false
observabilityExportEnabled=false
```

## Required Validation Commands

```bash
npm ci
npm run typecheck
npm run test --workspace @botomatic/runtime-spine
npm run proof:runtime-spine --workspace @botomatic/runtime-spine
```

## Known Follow-Up Issues

```text
#1872 — Post-merge stabilization: runtime-spine foundation
#1873 — Vercel environment parity audit
#1874 — runtime-spine proof and typecheck validation
#1875 — verify runtime-spine remains inactive in production
```
