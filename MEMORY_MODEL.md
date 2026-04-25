# Memory Model

Status: Active

Botomatic memory scopes:

- project memory
- user preference memory
- architecture memory
- decision memory
- assumption memory
- error memory
- codebase memory
- domain memory
- release memory

## Memory rules

- Retrieve memory before planning.
- Write memory after every major decision.
- Link memory to source evidence when possible.
- Compact old memory without losing decisions.
- Repo code and validator outputs override stale memory.

Implementation modules:
- `packages/memory-engine/src/types.ts`
- `packages/memory-engine/src/store.ts`
- `packages/memory-engine/src/retrieval.ts`
- `packages/memory-engine/src/compaction.ts`
