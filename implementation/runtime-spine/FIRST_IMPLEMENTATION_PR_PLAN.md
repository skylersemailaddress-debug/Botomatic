# First Runtime Spine Implementation PR Plan

## Purpose

Define the first real implementation PR after the architecture/governance program.

## Objective

Create the minimum durable runtime spine foundation without changing product UX or deployment behavior yet.

## PR Name

```text
Phase 16A — Runtime Spine Foundation
```

## Scope

Implement foundational runtime modules:

```text
runtime/orchestrator
runtime/queue
runtime/checkpoints
runtime/validators
runtime/tracing
```

## Initial Files

```text
packages/runtime-spine/src/types.ts
packages/runtime-spine/src/stateMachine.ts
packages/runtime-spine/src/queue.ts
packages/runtime-spine/src/checkpoints.ts
packages/runtime-spine/src/validatorRuntime.ts
packages/runtime-spine/src/tracing.ts
packages/runtime-spine/src/index.ts
packages/runtime-spine/package.json
packages/runtime-spine/tsconfig.json
packages/runtime-spine/README.md
```

## Initial Test Files

```text
packages/runtime-spine/src/__tests__/stateMachine.test.ts
packages/runtime-spine/src/__tests__/queue.test.ts
packages/runtime-spine/src/__tests__/checkpoints.test.ts
packages/runtime-spine/src/__tests__/validatorRuntime.test.ts
packages/runtime-spine/src/__tests__/tracing.test.ts
```

## Non-Goals

- no external queue provider yet
- no deployment execution yet
- no sandbox execution yet
- no UI changes
- no generated-app mutation yet
- no autonomous production actions yet

## Required Properties

- typed job lifecycle
- in-memory durable-interface implementation for tests
- bounded retry model
- dead-letter state
- checkpoint model
- validator blocking model
- trace propagation model

## Required npm Scripts

```json
{
  "proof:runtime-spine": "npm run test --workspace @botomatic/runtime-spine",
  "proof:queue-durability": "npm run test --workspace @botomatic/runtime-spine -- queue",
  "proof:validator-runtime": "npm run test --workspace @botomatic/runtime-spine -- validatorRuntime",
  "proof:orchestration-recovery": "npm run test --workspace @botomatic/runtime-spine -- checkpoints"
}
```

## Validation Gates

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run proof:baseline
npm run proof:runtime-spine
```

## Exit Criteria

The first PR is complete when:

- runtime-spine package exists
- lifecycle state machine is tested
- queue interface and memory implementation exist
- checkpoint interface and memory implementation exist
- validator runtime can block and pass jobs
- trace IDs propagate through job lifecycle
- all new proof scripts pass
