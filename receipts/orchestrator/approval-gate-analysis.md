# PHASE 1: Orchestrator Approval Gate Analysis

**ForensicEvidence:** 375/375 test cases blocked at `awaiting_architecture_approval` status  
**Root Blocker:** `getBuildBlockers()` returns non-empty array → operator/send returns `route: build_blocked`  
**Impact:** No plans generated, no artifacts, 0% PASS_REAL

---

## Gate Location & Flow

### Where Status Is Set
- **File:** `packages/master-truth/src/compiler.ts` line 254
- **When:** During master truth compilation (initial project state)
- **Value:** `status: "awaiting_architecture_approval"`

### Where Gate Is Enforced
- **File:** `apps/orchestrator-api/src/server_app.ts` lines 3165-3179
- **Endpoint:** `POST /api/projects/:projectId/operator/send`
- **Logic:**
  ```typescript
  if (!project.plan) {
    const buildBlockers = getBuildBlockers(project);
    if (buildBlockers.length > 0) {
      return res.json({
        ok: true,
        route: "build_blocked",
        status: project.status,
        blockers: buildBlockers,
        nextAction: "Resolve spec clarifications and approve build contract before planning.",
        // ← BLOCKED: Never reaches plan generation
      });
    }
    // ← Only reaches here if NO blockers exist
  }
  ```

### What Triggers Blockers
The `getBuildBlockers()` function (line 870-887) checks:

```typescript
function getBuildBlockers(project: StoredProjectRecord): string[] {
  const spec = getMasterSpec(project);
  if (!spec) {
    return ["Spec analysis is missing. Run spec analysis before planning."];
  }
  
  const contract = getBuildContract(project);
  const hasUploadedIntake = Object.values(getIntakeArtifacts(project) || {}).length > 0;
  
  // RULE 1: If uploaded intake exists AND contract is approved → NO BLOCKERS
  if (hasUploadedIntake && contract?.approvedAt) {
    return [];
  }
  
  // RULE 2: Standard blockers from spec
  const block = computeBuildBlockStatus(spec, Boolean(contract), false);
  const contractReady = contract?.readyToBuild && Boolean(contract?.approvedAt);
  
  // RULE 3: If contract is not ready → ADD BLOCKER
  const blockers = [...block.blockers];
  if (!contractReady) {
    blockers.push("Build contract is not approved and ready.");
  }
  return Array.from(new Set(blockers));
}
```

**Current Result for Test Cases:**
- ✓ Spec exists (created during intake)
- ✗ No uploaded intake artifacts → first condition fails
- ✗ No contract approved → `contractReady === false`
- ✓ Result: `["High-risk questions remain unresolved.", "Build contract is not approved and ready."]`

### What Transitions Are Allowed
Currently: **NONE** (blocked by gate)

To move forward, one of these must happen:
1. Manual approval via `POST /api/projects/:projectId/spec/approve` (no such endpoint exists for automated flow)
2. Make uploaded intake mandatory (not feasible for chat-first UX)
3. Bypass gate with auto-approval policy (THIS IS THE FIX)

---

## Control Flow State Machine

```
intake → compile → awaiting_architecture_approval
                        ↓
                   getBuildBlockers()
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
    blockers > 0                    blockers = 0
        │                               │
   build_blocked ──────────────────→ plan
        │                               │
    [STUCK]                         execute
                                        │
                                    artifacts
```

**Current Bug:** The system gets stuck in `awaiting_architecture_approval` because:
- Gate blocks planning until approvals exist
- No autonomous approval mechanism exists for safe conditions
- Chat-first UX doesn't have approval UI surfaces
- Test harness loops on "continue build" without progression

---

## Required Approval Types

From `packages/master-truth/src/compiler.ts` line 253:
```typescript
requiredApprovals: ["architecture", "security"]
```

From `packages/autonomous-build/src/specIngestion.ts` line 89-96:
```typescript
const requiredApprovals = [
  "explicit_live_deployment_approval",
  "paid_provider_action_approval",
  "destructive_rewrite_approval",
];
```

**Safety-Critical Approvals (must stay manual):**
- Live deployment (affects production)
- Paid provider spending (financial impact)
- Destructive rewrites (irreversible changes)

**Low-Risk Approvals (can be auto-approved):**
- Architecture review (contract completeness >= threshold)
- Security affiliation (no high-risk credentials in spec)
- Spec clarity (key assumptions resolved)

---

## Approval Policy Modes

### strict
- Require explicit manual approval for all gates
- No auto-progression
- Use case: Enterprise governance-first

### guided
- Auto-approve low-risk architecture/security when safe
- Ask human for high-risk (payments, live deploy, destructive ops)
- Use case: Controlled but progressive

### autopilot
- Auto-approve all safe conditions without interruption
- Only escalate high-risk decisions
- Default for private beta (chat-first UX)
- Use case: Chat-driven rapid iteration

### enterprise
- Full governance mode with all safety checks
- Requires all approvals
- Managed deployment gates
- Use case: Production enterprise deployments

---

## Auto-Approval Conditions (When Safe to Proceed)

For `autopilot` mode, auto-approve if ALL are true:

1. **Contract Completeness ≥ 70%**
   - Must have: objective, safetyConstraints, approvalGates (if applicable)
   - Check: `contract.completeness >= 0.7`

2. **No High-Risk Unresolved Decisions**
   - Must NOT have unresolved:
     - Auth/security questions (check `spec.unresolvedSecurityDecisions`)
     - Payment integrations (check for Stripe/payment without credentials)
     - Privacy/data residency (check for sensitive data handling)
   - Destructive operations (check for DELETE/TRUNCATE without approval)

3. **Blueprint Selected**
   - Must have a matched blueprint blueprint: `project.blueprint !== null`

4. **No Conflicting Requirements**
   - No contradictory constraints (e.g., "serverless" + "stateful database")
   - Check: `hasConflictingRequirements(spec) === false`

---

## Transition Logic (NEW)

```
if (approvalMode === 'autopilot' && canAutoApprove(project)) {
  // Auto-approve → advance to planning
  project.status = 'contract_ready'
  project.approvalMode = 'autopilot'
  project.autoApprovedAt = now()
  
  // Proceed directly to plan generation
  route = 'plan'
  plan = generatePlan(project.masterTruth)
  project.plan = plan
} else if (approvalMode === 'guided' && isHighRiskDecision(blockers)) {
  // Escalate human decision
  route = 'build_blocked_high_risk'
  nextAction = 'High-risk decisions require explicit approval.'
} else {
  // Preserve current behavior for strict/enterprise
  route = 'build_blocked'
}
```

---

## Implementation Plan

### PHASE 2: Add Approval Policy Engine
- Add `ApprovalPolicyEngine` class to `packages/governance-engine/src/`
- Define `approvalMode` type: `'strict' | 'guided' | 'autopilot' | 'enterprise'`
- Store mode in `project.approvalMode` (default: `'autopilot'`)
- Add default config to `RuntimeConfig`

### PHASE 3: Define Auto-Approval Rules
- Add `canAutoApprove(project)` validator
- Add `getHighRiskDecisions(blockers)` classifier
- Integrate into operator/send at line 3165

### Safety Guards
- Log all auto-approvals for audit trail
- Include `autoApprovedAt` timestamp in project record
- Emit event: `auto_approval_granted` with decision metadata
- Preserve human-intervention path: `POST /api/projects/:projectId/approvals/:type`

---

## Expected Outcome

**Before:** 375/375 blocked at `awaiting_architecture_approval`  
**After:** 375/375 reach plan generation (pending executor availability)

Estimated impact:
- 0% → ~40-60% PASS_REAL (executor & runtime issues remain)
- 100% FAIL_BUILDER → ~40% progress to plan + artifacts
- Unblocks entire artifact/build/run/smoke pipeline

---

## Testing Strategy

1. Use forensic runner with same 375 test cases
2. Measure transitions past `build_blocked` route
3. Verify `plan` generation succeeds for `autopilot` mode
4. Confirm audit events logged for each auto-approval
5. Ensure `strict` mode still requires manual approval

---

## Files to Modify

1. `packages/governance-engine/src/index.ts` — Add policy engine
2. `packages/governance-engine/src/approvalPolicy.ts` — NEW
3. `apps/orchestrator-api/src/server_app.ts` — Integrate at lines 3165-3179
4. `apps/orchestrator-api/src/config.ts` — Add approval mode config
5. `packages/supabase-adapter/src/types.ts` — Add `approvalMode` field to ProjectRecord

---

_Evidence lock: No UI changes. Control-flow orchestration only._
