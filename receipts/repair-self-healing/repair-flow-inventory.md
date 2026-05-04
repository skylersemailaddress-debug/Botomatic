# Repair Flow Inventory

Generated: 2026-05-03T00:00:00.000Z
Author: repair-self-healing-forensic-standards agent

---

## 1. Failure Classification

### Where failures are classified

| Location | Purpose |
|---|---|
| `packages/repair-loop/src/classifier.ts` | Classifies repo-level failure messages into: build, test, lint, typecheck, runtime, validator, unknown |
| `packages/repo-repair/src/failureClassifier.ts` | Classifies repo-level failures into: build, test, security, placeholder, deployment, unknown |
| `packages/autonomous-build/src/failurePolicy.ts` | Evaluates repair policy for milestone-level failures (has maxAttempts, escalation, etc.) |
| `packages/autonomous-build/src/blockerClassifier.ts` | Classifies blockers in the autonomous build loop |

**Gap identified**: None of these classifiers operate on *generated app workspace* failures (build_compile, smoke_route, missing_dependency, etc.). They only handle Botomatic repo-level failures.

---

## 2. Repair Intent Creation

### Where repair intent is created

| Location | Purpose |
|---|---|
| `packages/autonomous-build/src/autonomousRepairLoop.ts` | Creates repair intent (strategy + policy) for milestone failures |
| `packages/repo-repair/src/patchPlanner.ts` | Creates patch plan for repo-level repairs |
| `packages/repo-repair/src/completionPlanner.ts` | Creates completion plan for partially-built repos |
| `apps/orchestrator-api/src/server_app.ts:3590` | `/api/projects/:projectId/repair/replay` — triggers replay of failed packets |

**Gap identified**: No repair intent is created for *generated app workspace* failures. The `/repair/replay` endpoint only replays existing failed packets — it does not classify or patch the generated app source.

---

## 3. Repair Jobs Queued

### Where repair jobs are queued

| Location | Purpose |
|---|---|
| `apps/orchestrator-api/src/server_app.ts:3611` | `enqueueJob` is called for each repairable packet after replay |
| `apps/orchestrator-api/src/server_app.ts:3596` | Governance approval gate (`validateGovernanceForAction`) must pass before any replay |

**Critical blocker**: The `/repair/replay` endpoint requires:
1. `requireRole("admin")` — the forensic harness sends a dev-api-token, not an admin-role token
2. `validateGovernanceForAction("Replay")` — governance approval state must be satisfied
3. `getRepairablePackets(project)` must return at least one packet in a repairable state

In the forensic harness, none of these conditions are met, so `repair.ok` is always false.

---

## 4. Replay Happens

### Where replay happens

| Location | Purpose |
|---|---|
| `apps/orchestrator-api/src/server_app.ts:3608` | Loops over `repairablePackets`, calls `clearReplayState` + `setPacketStatus("pending")` + `enqueueJob` |
| `apps/orchestrator-api/src/server_app.ts:~1449` | Worker loop dequeues jobs and calls `executor.execute` |

**Gap identified**: Replay only re-executes existing packets. It does not apply source-level patches to a generated app workspace. A packet re-execution with the same broken code will reproduce the same failure.

---

## 5. Rollback Points Stored

### Where rollback points are stored

| Location | Purpose |
|---|---|
| `packages/autonomous-build/src/checkpointStore.ts` | Stores checkpoint state including `repairHistory`, `repairAttempts`, `artifactPaths` |
| `packages/repo-completion/src/dirtyRepoRepairLoop.ts` | Manages rollback for dirty-repo repair loops |

**Gap identified**: No rollback snapshots of generated app workspace files are created before repair patches are applied. There is no per-file content-hash record for generated app repair.

---

## 6. Repair Success Scored

### Where repair success is scored

| Location | Purpose |
|---|---|
| `scripts/builder-forensic/run.mjs:128` | `repairLoopSuccess = Boolean(caseResult.repair?.ok)` |
| `scripts/builder-forensic/run.mjs:193` | `repairSuccess` counter incremented in `summarizeCases` |
| `scripts/builder-forensic/report.mjs:251` | `repairedSuccessfully` count in summary |

**Root cause of repairSuccess = 0%**: The forensic harness sets `repair = await safeFetchJson(`.../repair/replay`, ...)`. This endpoint returns 409 (governance not satisfied) or 401 (not admin role). So `repair.ok` is always false. `repairLoopSuccess` is never true. `repairSuccess` is permanently 0.

---

## 7. Current Repair Mode Selection

### How repair mode corpus is picked

`run.mjs:47-51` — repair mode filters corpus for items with category including: `follow-up`, `edit`, `recovery`, or `dirty-repo`. These are API-routing categories, not actual failing workspace categories.

**Bug**: `process.argv[2]` is `--mode` when called as `node run.mjs --mode repair`, so `MODE` is `"--mode"`, not `"repair"`. The mode filtering never activates.

---

## 8. Follow-up Edit Path

### Where follow-up edit happens

| Location | Purpose |
|---|---|
| `scripts/builder-forensic/run.mjs:307-319` | Sends follow-up prompt to `/api/projects/:projectId/operator/send` |
| `scripts/builder-forensic/run.mjs:126` | `followupEditSuccess = Boolean(caseResult.followup?.ok)` — checks HTTP 2xx only |

**Gap identified**: Follow-up edit is scored only on HTTP response status, not on whether the edit actually mutated the workspace and the result passed build/run/smoke. A 200 response with no real change counts as success.

---

## 9. Summary of Gaps

| Gap | Severity | Fix |
|---|---|---|
| MODE parsing bug (`--mode` not parsed correctly) | High | Fix `parseMode()` in `run.mjs` |
| `/repair/replay` governance-gated, always fails in harness | Critical | Standalone repair engine operating on workspace files |
| No generated-app repair planner (source patching) | Critical | Implement repair planner + patcher |
| No rollback snapshots before patch | High | Create snapshot before each patch |
| No real failing workspaces to repair in forensic harness | Critical | Create deterministic failing fixtures |
| Follow-up edit success not validated by build/run/smoke | Medium | Add post-edit build/run/smoke validation |
| Repair success counted from `repair.ok` HTTP flag only | Critical | Count only after real build/run/smoke pass |

---

## 10. New Repair Contract

The new repair contract (implemented in `scripts/builder-forensic/repair-engine.mjs`) covers:

```
projectId           — fixture or project identifier
failingJobId        — unique repair job ID
failingWorkspacePath — absolute path to generated app workspace
failureType         — build_compile | build_typecheck | dependency | runtime_start | smoke_route | test_failure | missing_workspace | missing_artifact | unknown
failureLogs         — captured stdout/stderr from failing command
failingCommand      — exact command that failed
failingRoute        — HTTP route that returned unexpected status (for smoke failures)
rollbackPoint       — path to rollback snapshot or map of {file: originalContent}
repairPlan          — {diagnosis, changedFiles, rationale, rollbackPath, commandsToRerun}
patchSet            — [{file, op, before, after}]
retryCount          — current attempt number
maxRetries          — 3
postRepairBuildStatus — ok | fail | timeout
postRepairRunStatus   — ok | fail | timeout
postRepairSmokeStatus — ok | fail | timeout
finalClassification   — REPAIRED | UNREPAIRED | REPAIR_BUDGET_EXHAUSTED
```
