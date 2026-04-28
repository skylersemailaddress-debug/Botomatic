# Secret leak prevention (DEPLOY-001)

This validator uses **static pattern scanning** for likely plaintext secret exposure in repository text/config/doc surfaces.

## Scan scope
- `.env.example`
- root `README.md`
- `docs/**/*.md`
- `*.json`, `*.yaml`, `*.yml`, `*.toml`
- `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.cjs`, `*.mjs`
- common config/rc file patterns

## Skip scope
- `.git/`
- `node_modules/`
- build output: `dist/`, `build/`, `.next/`, `coverage/`
- binary/media/assets-like extensions (images, archives, fonts, videos)
- lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- generated app corpus fixture tree under `fixtures/generated-app-corpus/`

## Approved secret reference formats (examples/templates)
- `secret://provider/env/key`
- `<REQUIRED_SECRET_REF>`
- `changeme-only-if-non-secret`
- empty value
- `replace_at_runtime`

## Detection coverage
Patterns include likely plaintext:
- API key/token/password assignments
- bearer token strings
- private key blocks
- Stripe live keys (`sk_live_...`)
- OpenAI/Anthropic-like key formats
- GitHub PAT-like tokens
- Vercel/Supabase-looking tokens
- Twilio/SendGrid-like patterns
- generic high-risk long token assignments in secret-like fields

## Limitations and claim boundary
- This is static pattern scanning, **not exhaustive secret detection**.
- No statement from this validator should be interpreted as “zero leaks proven”.
- Results are evidence-bounded to scanned file classes and skip rules.
