# Production Runtime Topology

## Purpose

Define the target production runtime topology for Botomatic autonomous orchestration.

## Core Runtime Layers

### Layer 1 — API Edge

Responsibilities:

- user ingress
- orchestration requests
- authentication
- tenant attribution
- trace initialization

---

### Layer 2 — Orchestration Runtime

Responsibilities:

- scheduler coordination
- queue orchestration
- retry governance
- cancellation propagation
- checkpoint persistence
- validator replay

---

### Layer 3 — Distributed Worker Fleet

Responsibilities:

- execution leasing
- heartbeat emission
- runtime execution
- proof generation
- validator execution

---

### Layer 4 — Persistence Layer

Components:

- postgres runtime persistence
- redis queue runtime
- object storage for artifacts

---

### Layer 5 — Observability Layer

Components:

- OpenTelemetry
- runtime metrics
- trace correlation
- error aggregation
- runtime dashboards

---

### Layer 6 — Governance Layer

Responsibilities:

- timeout enforcement
- dead-letter routing
- validator governance
- cancellation governance
- deployment governance

## Deployment Principles

- no single worker dependency
- all execution replayable
- all execution attributable
- all validators replayable
- all traces queryable
- all failures recoverable

## Required Future Infrastructure

- kubernetes worker orchestration
- autoscaling policies
- redis HA cluster
- postgres HA topology
- artifact retention governance
- production dashboarding

## Exit Criteria

Production topology planning exits only when:

- deployment diagrams exist
- infrastructure-as-code exists
- autoscaling policy exists
- disaster recovery policy exists
- production SLOs exist
