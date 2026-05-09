# Runtime Spine Operational Runbook

## Purpose

Define operator actions for runtime-spine incidents, activations, rollbacks, and recovery workflows.

## Primary Operator Workflows

### Runtime Activation

1. Confirm runtime-spine CI proof workflow is green.
2. Confirm migrations validated in target environment.
3. Confirm observability collector is receiving traces and metrics.
4. Confirm dashboards and alerts are operational.
5. Enable runtime feature flags by stage.
6. Monitor queue, worker, validator, sandbox, and deployment metrics.

---

### Runtime Rollback

1. Disable runtime feature flags.
2. Freeze new runtime job intake.
3. Preserve active checkpoint and validator lineage.
4. Route unsafe jobs to blocked or dead-letter states.
5. Restore prior infrastructure/deployment version.
6. Verify runtime health and trace continuity.

---

### Stale Worker Response

1. Identify stale worker by heartbeat gap.
2. Confirm lease expiration.
3. Requeue recoverable jobs from latest checkpoint.
4. Dead-letter unsafe jobs.
5. Escalate repeated stale-worker events.

---

### Validator Replay Failure

1. Locate trace and job lineage.
2. Load latest checkpoint.
3. Re-run validator replay.
4. Block deployment if replay fails.
5. Escalate if release evidence is incomplete.

---

### Sandbox Violation

1. Block affected job.
2. Preserve sandbox logs and artifacts.
3. Disable sandbox execution if repeated.
4. Escalate security incident.
5. Require proof:sandbox-isolation before reactivation.

## Required Operator Signals

- trace_id
- tenant_id
- project_id
- job_id
- validator_id
- deployment_id
- rollout_id

## Exit Criteria

The runbook is operational only when:

- linked from deployment procedures
- used in incident drills
- validated against runtime proof failures
- reviewed before production activation
