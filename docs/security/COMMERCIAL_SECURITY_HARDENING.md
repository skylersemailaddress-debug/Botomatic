# Commercial Security Hardening

Botomatic hosted autonomous builder routes enforce baseline commercial controls:

- **Rate limits**: login/auth, operator chat mutations, build starts, upload/intake mutations, deployment/governance mutations, and expensive AI/provider planning routes are bucketed by actor/project/IP.
- **CSRF and same-origin**: browser-originating mutating requests are rejected when `Origin` or `Sec-Fetch-Site` shows cross-site traffic. Bearer-token API clients without browser `Origin` headers remain supported.
- **Upload safety**: uploads require route auth, a configured file-size cap, supported extension/MIME checks, content sniffing, path traversal prevention, symlink rejection, archive file-count and extracted-size caps, compression-ratio archive bomb checks, and extraction into a per-project work directory under the configured intake upload root.
- **Malware scanning hook**: `BOTOMATIC_MALWARE_SCANNER` is the integration point for ClamAV, VirusTotal, or a hosting-provider malware scanning product. Local/test runs use the documented `provider_placeholder`; configured scanners may block EICAR-style test signatures.
- **Tenant-scoped artifacts**: upload artifact IDs include tenant and project scope before the opaque intake ID.
- **Secrets**: secret values are redacted from route errors/logs. Provider keys are not injected into generated apps; generated apps may receive provider credentials only when users explicitly configure vault-backed secret references for that generated project.
- **Secret scanning scope**: source, docs, tests, examples, release evidence, logs, and generated-app fixtures are scanned. Allowlist entries must be narrow, fixture-specific, and never include live credential values.
- **Headers/cookies**: CSP, HSTS in production, `X-Content-Type-Options`, `Referrer-Policy`, frame denial, permissions policy, and secure/httpOnly/sameSite cookies are set for browser surfaces.
