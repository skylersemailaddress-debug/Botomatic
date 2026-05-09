# Sandbox Isolation Architecture

## Purpose

Define the minimum sandbox architecture required before Botomatic executes generated code or deployment actions in production.

## Required Boundaries

- generated code isolated from platform internals
- tenant and project scoped execution
- no host secret access
- bounded filesystem access
- governed network egress
- CPU and memory quotas
- execution timeout enforcement
- artifact-only output contract
- trace and audit correlation

## Runtime Layers

```text
orchestration job
-> sandbox request
-> isolated runtime
-> validator execution
-> artifact extraction
-> teardown
```

## Required Isolation Controls

- container isolation
- read-only base image
- disposable workspace
- explicit mounted artifacts
- no implicit credential inheritance
- network policy allowlist
- stdout/stderr redaction
- max runtime duration

## Required Proof Gates

```text
proof:sandbox-isolation
proof:no-host-secret-access
proof:network-egress-policy
proof:sandbox-timeout
proof:artifact-boundary
```

## Non-Goals

- no production generated-code execution until isolation proofs pass
- no deployment credentials inside default sandbox
- no shared writable workspace across tenants

## Exit Criteria

Sandbox isolation exits only when:

- sandbox executor exists
- filesystem boundary tests exist
- network boundary tests exist
- secret boundary tests exist
- timeout enforcement exists
- artifact extraction is validator-gated
