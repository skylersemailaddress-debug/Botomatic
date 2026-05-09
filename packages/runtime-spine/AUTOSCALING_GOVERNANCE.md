# Autoscaling Governance

## Purpose

Define the autoscaling governance model for the distributed Botomatic runtime.

## Required Scaling Signals

- queue depth
- execution latency
- retry rate
- dead-letter rate
- heartbeat failures
- worker saturation
- deployment backlog

## Scaling Rules

### Scale Up

Allowed when:

- queue depth exceeds threshold
- execution latency exceeds SLO
- workers remain healthy
- dead-letter rate remains below threshold

---

### Scale Down

Allowed when:

- queue depth stabilizes
- no active deployment windows
- no lease renewal failures
- no replay backlog

## Governance Constraints

- no scaling during runtime instability
- no scaling during rollback execution
- no scaling when validator replay backlog exists
- all scaling decisions attributable
- all scaling events trace-correlated

## Required Future Integrations

- kubernetes HPA
- queue-aware scaling
- deployment-aware scaling
- regional failover scaling
- cost-aware scaling

## Required Runtime Metrics

- workers active
- workers saturated
- leases active
- retry escalation rate
- replay backlog
- orchestration throughput

## Exit Criteria

Autoscaling governance exits only when:

- autoscaling executor exists
- autoscaling proofs exist
- runtime scaling SLOs exist
- scaling rollback exists
- regional failover strategy exists
