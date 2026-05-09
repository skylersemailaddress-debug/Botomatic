# Web Attack Surface Audit

## Status

```text
initial audit
```

## Purpose

Evaluate exposure to SSRF, XSS, CSRF, prompt-injection-assisted attacks, and unsafe runtime/web execution patterns.

## Required Security Properties

- SSRF protection
- XSS output sanitization
- CSRF protections
- CSP enforcement
- prompt-injection containment
- network egress governance
- unsafe URL validation
- sandboxed rendering/execution
- upload-origin validation
- audit logging

## Required Questions

1. Can generated apps perform SSRF attacks?
2. Can user/generated content inject executable scripts?
3. Are state-changing routes CSRF protected?
4. Can prompt injection alter orchestration behavior?
5. Are unsafe URLs blocked/sanitized?
6. Can generated previews execute unsafe content?
7. Are outbound requests governed and attributable?
8. Can browser/runtime state leak across tenants?

## Initial Risks

### WAS-001 — SSRF/external-network abuse risk

Severity:

```text
P1
```

Autonomous systems with outbound network access require strict governance.

### WAS-002 — generated-content XSS risk

Severity:

```text
P1
```

Generated applications and previews can unintentionally expose executable attack surfaces.

### WAS-003 — prompt-injection orchestration risk

Severity:

```text
P1
```

Prompt injection can distort reasoning, retrieval, or autonomous execution.

## Desired Direction

```text
user/generated content
-> validation/sanitization
-> sandboxed rendering/execution
-> governed outbound access
```

## Required Security Tooling

```text
OWASP ZAP
Semgrep
CodeQL
CSP scanners
Playwright security tests
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| threat modeling | GPT-5.5 | Claude Opus |
| runtime hardening | Codex/Cursor | Claude Opus |
| security testing | OWASP ZAP/Playwright | Vitest |
| static analysis | Semgrep/CodeQL | GPT-5.5 |
