# Botomatic Builder Forensic Pipeline Inventory

Generated: 2026-05-02
Branch: fix/builder-forensic-capability-stress

## Stage 1: User prompt intake
- Code path:
  - apps/control-plane/src/components/chat/ConversationPane.tsx
  - apps/control-plane/src/components/chat/chatCommandExecutor.ts
- API endpoint:
  - POST /api/projects/intake
  - POST /api/projects/:projectId/operator/send
- Persistence/state:
  - project record in orchestrator project store
  - chat/runtime context in project.runs and execution state
- Expected success output:
  - projectId returned
  - operator command accepted and routed
- Current test coverage:
  - npm run -s test:chat-driven-control
  - npm run -s test:chat-routing-validator
  - npm run -s test:chat-behavior-execution-validator
- Failure modes:
  - API unavailable (ECONNREFUSED)
  - auth/token rejection
  - malformed command payload

## Stage 2: Spec extraction
- Code path:
  - packages/spec-engine/src/specAnalyzer.ts
  - packages/spec-engine/src/completeness.ts
- API endpoint:
  - POST /api/projects/:projectId/spec/analyze
  - POST /api/projects/:projectId/spec/clarify
- Persistence/state:
  - spec attached to project snapshot
- Expected success output:
  - structured spec with completeness and assumptions
- Current test coverage:
  - npm run -s test:spec-engine
- Failure modes:
  - low-completeness vague prompts
  - contradictory requirement extraction

## Stage 3: Build contract creation
- Code path:
  - packages/spec-engine/src/buildContract.ts
  - apps/orchestrator-api/src/server_app.ts
- API endpoint:
  - POST /api/projects/:projectId/spec/build-contract
  - POST /api/projects/:projectId/spec/approve
- Persistence/state:
  - build contract under project status record
- Expected success output:
  - approved contract with blockers/readyToBuild
- Current test coverage:
  - npm run -s test:build-contract
- Failure modes:
  - unresolved blockers
  - missing master truth/spec state

## Stage 4: Planning
- Code path:
  - POST /api/projects/:projectId/compile handler in server_app.ts
  - POST /api/projects/:projectId/plan handler in server_app.ts
- API endpoint:
  - POST /api/projects/:projectId/compile
  - POST /api/projects/:projectId/plan
- Persistence/state:
  - project plan/milestones under execution payload
- Expected success output:
  - planned packets/milestones
- Current test coverage:
  - npm run -s test:upload-plan-handoff
- Failure modes:
  - no master truth
  - compile-plan sequencing fault

## Stage 5: Code generation/execution
- Code path:
  - packages/autonomous-build/src
  - packages/executor-adapters/src
- API endpoint:
  - POST /api/projects/:projectId/autonomous-build/start
  - POST /api/projects/:projectId/dispatch/execute-next
- Persistence/state:
  - run checkpoint in project.runs
- Expected success output:
  - execution run id and progress graph
- Current test coverage:
  - npm run -s test:ui-live-builder-orchestration-model
  - npm run -s test:ui-live-builder-orchestration-planner
- Failure modes:
  - adapter/provider unavailability
  - run budget exhaustion

## Stage 6: File output + source sync
- Code path:
  - packages/ui-preview-engine/src/uiSourceApply.ts
  - packages/ui-preview-engine/src/uiSourceApplyTransaction.ts
- API endpoint:
  - GET /api/projects/:projectId/ui/overview
  - GET /api/projects/:projectId/ui/artifacts
- Persistence/state:
  - generated source files and artifact map
- Expected success output:
  - source apply transaction succeeds
- Current test coverage:
  - npm run -s test:ui-source-apply
  - npm run -s test:ui-source-apply-transaction
  - npm run -s test:ui-source-round-trip
- Failure modes:
  - patch conflict
  - transaction rollback required

## Stage 7: Preview/runtime start
- Code path:
  - apps/control-plane runtime API proxies
  - packages/validation/src/runtime/generatedAppRuntimeSmokeRunner.ts
- API endpoint:
  - GET /api/projects/:projectId/runtime
  - GET /api/projects/:projectId/execution
- Persistence/state:
  - runtime session status and execution logs
- Expected success output:
  - runtime reachable checks and logs available
- Current test coverage:
  - npm run -s test:generated-app-runtime-smoke-runner
- Failure modes:
  - local runtime not reachable
  - missing project path/start command

## Stage 8: Source sync + follow-up edit
- Code path:
  - apps/control-plane/src/components/chat/chatCommandExecutor.ts
  - ui preview mutation planner modules
- API endpoint:
  - POST /api/projects/:projectId/operator/send
- Persistence/state:
  - updated run state and source history
- Expected success output:
  - follow-up command applied without unrelated file damage
- Current test coverage:
  - npm run -s test:ui-multi-file-edit-plan
  - npm run -s test:ui-cross-component-edit-planner
- Failure modes:
  - target-resolution miss
  - unsafe multi-file edit rejected

## Stage 9: Tests/validators
- Code path:
  - packages/validation/src/cli.ts
  - generated app validators/corpus harness
- API endpoint:
  - GET /api/projects/:projectId/ui/gate
  - GET /api/projects/:projectId/ui/proof-status
- Persistence/state:
  - validator output in receipts and runtime state
- Expected success output:
  - validator pass or explicit blockers
- Current test coverage:
  - npm run -s validate:all
  - npm run -s test:universal
- Failure modes:
  - placeholder/fake contamination
  - missing proof artifacts

## Stage 10: Repair loop
- Code path:
  - packages/autonomous-build/src/autonomousRepairLoop.ts
  - packages/repo-completion/src/dirtyRepoRepairLoop.ts
- API endpoint:
  - POST /api/projects/:projectId/repair/replay
  - POST /api/projects/:projectId/autonomous-build/resume
- Persistence/state:
  - repair history in checkpoint and repair memory
- Expected success output:
  - classified failure + selected repair strategy + rerun
- Current test coverage:
  - npm run -s test:adaptive-repair-strategy
  - npm run -s test:dirty-repo-repair-loop-proof
- Failure modes:
  - repair budget exhausted
  - escalation required for unsafe fix

## Stage 11: Export/deploy readiness
- Code path:
  - deploy provider gates in server_app.ts
  - export/deploy planners in ui-preview-engine
- API endpoint:
  - POST /api/projects/:projectId/deploy/promote
  - POST /api/projects/:projectId/deploy/rollback
  - GET /api/projects/:projectId/ui/deployments
- Persistence/state:
  - deployment history and gate decisions
- Expected success output:
  - readiness outcome and governed deploy state
- Current test coverage:
  - npm run -s test:deploy-route-gates
- Failure modes:
  - missing credentials
  - role/gate denial

## Stage 12: Evidence/receipts
- Code path:
  - scripts/builder-forensic/run.mjs
  - scripts/builder-forensic/report.mjs
- API endpoint:
  - GET /api/projects/:projectId/ui/audit
- Persistence/state:
  - receipts/builder-forensic/*
- Expected success output:
  - summary.json, summary.md, capability-matrix.csv, top-blockers.md, claim-boundary.md
- Current test coverage:
  - npm run -s test:builder-forensic:smoke
  - npm run -s test:builder-forensic:report
- Failure modes:
  - missing run receipts
  - stale/duplicate run aggregation
