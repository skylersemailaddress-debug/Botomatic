# DEPLOY-001 Secret Leak Prevention

## Static pattern scanning
DEPLOY-001 performs static pattern scanning over a safe source set:
- `.env.example`, `README.md`, `docs/**/*.md`
- `json/yaml/yml/toml`
- `ts/tsx/js/jsx/cjs/mjs`
- common config/rc files

## Scan scope and skip scope
Scanning explicitly skips:
- `.git`, `node_modules`, `dist`, `build`, `.next`, `coverage`, `.cache`
- binary/media/assets and lockfiles
- `fixtures/generated-app-corpus/`
- test fixtures / test files where appropriate

## Secret patterns covered
Provider-specific and generic patterns include Stripe live keys, GitHub PAT-like tokens, AWS access keys, Slack tokens, private key blocks, JWTs, OpenAI/Anthropic-like keys, Vercel/Supabase-looking tokens, SendGrid/Twilio-like patterns, bearer tokens, and high-risk token/password assignments.

## Detection boundary
- This is static pattern scanning and is **not exhaustive** secret detection.
- DEPLOY-001 makes **no "zero leaks proven" claim**.
- Example/template secret-like values must be placeholders only (`secret://...`, `<REQUIRED_SECRET_REF>`, `changeme-only-if-non-secret`, `replace_at_runtime`, or empty values).
