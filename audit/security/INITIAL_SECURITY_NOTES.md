# Initial Security Notes

## Status

```text
pending baseline execution and security scan
```

## Required Review Areas

- authentication
- authorization
- route protection
- tenant isolation
- secrets handling
- upload handling
- archive extraction
- generated-code sandboxing
- deployment credentials
- SSRF/XSS/CSRF
- dependency vulnerabilities
- audit logs
- rate limiting

## Required Tools

- Semgrep
- CodeQL
- npm audit
- Snyk
- Gitleaks
- TruffleHog
- Trivy

## Initial Questions

1. Can tenants access other tenant data?
2. Are auth-disabled/dev bypass paths reachable?
3. Are secrets exposed in repo or logs?
4. Are uploads sandboxed safely?
5. Can generated code escape isolation?
6. Are launch-critical routes protected?

## Model Assignment

- Primary reasoning: GPT-5.5
- Scan execution: security tooling + Codex/Cursor
- Large remediation passes: Claude Opus

## Findings

Pending.
