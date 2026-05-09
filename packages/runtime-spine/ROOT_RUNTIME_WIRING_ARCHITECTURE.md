# Root Runtime Wiring Architecture

## Purpose

Define how runtime-spine should integrate with the Botomatic root application without destabilizing current product behavior.

## Integration Boundary

Runtime-spine must enter the root app through an explicit adapter layer only.

```text
root app
-> runtime adapter
-> feature gate
-> runtime-spine package
-> proof-backed execution
```

## Required Adapter Responsibilities

- load runtime feature flags
- initialize trace context
- enforce tenant/project attribution
- route jobs to scheduler
- persist execution state
- emit runtime metrics
- block disabled features

## Required Safety Controls

- disabled by default
- no deployment execution until enabled
- no sandbox execution until enabled
- no production activation without CI proof pass
- no migration execution without backup
- no root behavior mutation without rollback path

## Integration Phases

### Phase A — Import Only

- add runtime-spine workspace
- import types only
- no runtime execution

### Phase B — Feature Gate

- wire runtime feature flags
- keep all runtime actions disabled
- validate disabled behavior

### Phase C — Local Proof Runtime

- run runtime-spine proof harness from root script
- no production jobs

### Phase D — Controlled Staging Activation

- enable observability only
- keep sandbox/deployment disabled

### Phase E — Production Candidate

- enable after CI, DR, rollback, and security proofs pass

## Exit Criteria

Root runtime wiring exits only when:

- root adapter exists
- feature gates are tested
- disabled-by-default behavior is verified
- root proof command exists
- rollback path exists
