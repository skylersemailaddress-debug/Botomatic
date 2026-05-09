# Phase 6 Entry Packet — Autonomous Builder Engine Audit and Hardening

## Purpose

Audit and harden the autonomous builder engine responsible for planning, execution, repair, state continuity, orchestration, and runtime lifecycle management.

## Phase Goal

Ensure the Botomatic engine behaves like a governed, durable, restart-safe autonomous execution system rather than an optimistic prompt loop.

## Required Audit Areas

1. orchestration state lifecycle
2. planner/executor separation
3. repair-loop orchestration
4. job lifecycle management
5. checkpointing and recovery
6. execution durability
7. runtime replayability
8. rollback/recovery governance
9. long-running task governance
10. observability and traceability

## Required Outputs

```text
audit/engine/ORCHESTRATION_STATE_AUDIT.md
audit/engine/PLANNER_EXECUTOR_BOUNDARY_AUDIT.md
audit/engine/REPAIR_ORCHESTRATION_AUDIT.md
audit/engine/JOB_LIFECYCLE_AUDIT.md
audit/engine/CHECKPOINT_AND_RECOVERY_AUDIT.md
audit/engine/PHASE_6_EXECUTIVE_SUMMARY.md
```

## Required Questions

1. Is execution restart-safe?
2. Are planner and executor responsibilities separated?
3. Can repair loops destabilize execution?
4. Are jobs resumable and replayable?
5. Can failures be classified deterministically?
6. Is orchestration state durable?
7. Can long-running tasks survive interruptions?
8. Are rollbacks recoverable and auditable?
9. Are generated-app mutations replayable?
10. Are all actions traceable to Build Contracts and approvals?

## Core Direction

```text
intent
-> governed plan
-> orchestrated execution
-> validator replay
-> repair/recovery
-> durable evidence
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| orchestration reasoning | GPT-5.5 | Claude Opus |
| implementation | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| observability | OpenTelemetry/Sentry | GPT-5.5 |
| durability/recovery testing | GitHub Actions | Vitest |

## Exit Criteria

Phase 6 exits only when:

- orchestration state is durable
- planner/executor boundaries are explicit
- repair loops are governed
- jobs are replayable/restart-safe
- checkpoint/recovery systems exist
- rollback/recovery paths are auditable
