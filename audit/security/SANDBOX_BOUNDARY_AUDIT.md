# Sandbox Boundary Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated code, execution runtimes, uploads, and autonomous workflows are safely sandboxed from Botomatic core systems and tenant data.

## Required Sandbox Properties

- runtime isolation
- filesystem isolation
- network egress controls
- process isolation
- container isolation
- credential isolation
- execution timeout governance
- resource quotas
- generated-app/runtime separation
- audit logging

## Required Questions

1. Can generated code access Botomatic internals?
2. Can generated apps escape runtime boundaries?
3. Are network requests governed and auditable?
4. Can execution access host/container secrets?
5. Are runtime quotas enforced?
6. Can uploaded files execute arbitrary code?
7. Are sandbox failures isolated per tenant/project?
8. Are execution environments reproducible and disposable?

## Initial Risks

### SBA-001 — runtime escape risk

Severity:

```text
P1
```

Generated code execution requires hardened isolation boundaries.

### SBA-002 — unrestricted egress risk

Severity:

```text
P1
```

Autonomous systems can unintentionally exfiltrate data through uncontrolled outbound access.

### SBA-003 — shared runtime contamination risk

Severity:

```text
P1
```

Shared execution environments can violate tenant and project isolation guarantees.

## Desired Direction

```text
user/generated code
-> isolated sandbox
-> governed runtime access
-> observable execution
-> disposable environment
```

## Required Security Tooling

```text
Docker/gVisor/Firecracker
Seccomp/AppArmor
Trivy
Falco
Playwright/Vitest security tests
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| threat modeling | GPT-5.5 | Claude Opus |
| runtime hardening | Codex/Cursor | Claude Opus |
| runtime testing | Playwright/Vitest | Codex/Cursor |
| container scanning | Trivy/Falco | GPT-5.5 |
