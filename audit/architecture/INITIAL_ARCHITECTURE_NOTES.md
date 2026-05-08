# Initial Architecture Notes

## Status

```text
pending baseline execution and repo inspection
```

## Purpose

Record Phase 1 findings about whether Botomatic is structured like a commercial autonomous software builder.

## Required Review Areas

- repo/workspace boundaries
- control-plane boundaries
- orchestrator API boundaries
- spec engine boundaries
- Build Contract boundaries
- planner/executor boundaries
- validation/proof boundaries
- generated-app isolation
- tenant/project isolation
- live preview/source sync boundaries
- deployment/export boundaries
- observability boundaries

## Initial Questions

1. Is chat intake separated from execution?
2. Is planning separated from source mutation?
3. Is validation separated from claims?
4. Is generated app code isolated from Botomatic core?
5. Is the executor durable and restartable?
6. Are launch gates non-bypassable?
7. Are commercial systems first-class or bolted on?

## Model Assignment

- Primary: GPT-5.5
- Execution support: Codex/Cursor
- Large refactors after classification: Claude Opus

## Findings

Pending.
