# Local Beta Launch

Two one-command launchers that fetch a fresh Auth0 OIDC token and start the
local control-plane UI pointed at the hosted Railway backend.

## Architecture

```
Browser (localhost:3000)
  └─▶ Next.js control-plane (local, port 3000)
        └─▶ /api/* catch-all proxy  ──▶  Railway hosted API
                                          ├─ OpenAI / Anthropic / Gemini
                                          ├─ GitHub
                                          └─ Supabase (queue + DB)
```

**Local machine does NOT need OpenAI / Anthropic / Gemini / GitHub / Supabase
provider secrets — those live in Railway's environment.**

The only secrets required locally are Auth0 smoke-client credentials to obtain
a valid OIDC access token for authenticating with the hosted API.

---

## Commands

| Command | What it does |
|---|---|
| `npm run launch:beta:full` | Full preflight + start UI |
| `npm run launch:beta:full:check` | Preflight checks only — print GO / NO-GO, no UI start |
| `npm run launch:beta:local` | Simpler launcher (no ops/metrics check, no GO/NO-GO) |

### Recommended: `launch:beta:full`

```powershell
cd C:\Users\<you>\Botomatic
npm run launch:beta:full
```

### Check-only (useful in CI or before a demo):

```powershell
npm run launch:beta:full:check
```

Exits 0 if all checks pass, 1 if any fail.

---

## Setup: create the secrets file

Create the file at exactly this path (outside the repo — **never commit it**):

```
%USERPROFILE%\Botomatic-local-secrets\beta-launch.env
```

### Required keys

```
AUTH0_DOMAIN=dev-7fq48efb26j44svb.us.auth0.com
AUTH0_SMOKE_CLIENT_ID=<real smoke client id>
AUTH0_SMOKE_CLIENT_SECRET=<real rotated smoke client secret>
AUTH0_AUDIENCE=https://botomatic.local/api
BOTOMATIC_BETA_BASE_URL=https://botomatic-etmt-production.up.railway.app
```

### Optional keys (fall back to safe defaults if omitted)

```
BOTOMATIC_BETA_PROJECT_ID=proj_<your-project-id>
BOTOMATIC_BETA_USER_ID=beta-smoke-admin
BOTOMATIC_BETA_TENANT_ID=beta-smoke-tenant
NEXT_PUBLIC_API_BASE_URL=https://botomatic-etmt-production.up.railway.app
BOTOMATIC_API_BASE_URL=https://botomatic-etmt-production.up.railway.app
API_BASE_URL=https://botomatic-etmt-production.up.railway.app
```

---

## What `launch:beta:full` does

1. Loads secrets from `%USERPROFILE%\Botomatic-local-secrets\beta-launch.env`
2. Rejects any value containing `YOUR_`, `PASTE_`, `REPLACE_`, `changeme`, or `placeholder`
3. POSTs to Auth0 `client_credentials` → gets access token
4. Validates token starts with `eyJ` (JWT sanity check)
5. Sets `BOTOMATIC_BETA_AUTH_TOKEN` and other env vars in the current process
6. **Preflight checks:**
   - `/api/health` — Railway API health
   - `/api/ready` — Railway API readiness
   - `/api/ops/metrics` — Protected route (verifies auth token + role)
   - `/api/projects/:projectId/runtime` — Project status (if `BOTOMATIC_BETA_PROJECT_ID` set)
7. Prints **GO / NO-GO** summary
8. Kills ports 3000/3001/4000, clears `.next` cache
9. Starts `npm run ui:dev`, opens `http://localhost:3000` after 10 s

---

## Build flow

When you submit a prompt in the BetaHQ UI:

1. `POST /api/projects/intake` → creates project on Railway (status: `clarifying`)
2. `POST /api/projects/:projectId/build/start` → triggers `autonomous-build/start` on Railway
3. Railway uses its own `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc. to execute the build
4. BetaHQ polls every 5 s for status updates

If the build cannot start (worker unavailable, provider unavailable, missing prompt), the UI
shows the exact error from Railway — no fake success.

---

## Security notes

- **Never commit** `beta-launch.env` or any file containing `AUTH0_SMOKE_CLIENT_SECRET`.
- `BOTOMATIC_BETA_AUTH_TOKEN` is set only in the local process environment — it is never
  written to disk and never exposed to client-side browser code.
- The token is injected server-side by the Next.js proxy
  (`apps/control-plane/src/app/api/[...path]/route.ts`).
- Rotate `AUTH0_SMOKE_CLIENT_SECRET` if it is ever accidentally exposed.
- Provider secrets (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `SUPABASE_*`)
  **stay in Railway** — they are never set on your local machine.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Secrets file not found` | Create `%USERPROFILE%\Botomatic-local-secrets\beta-launch.env` |
| `still contains a placeholder value` | Replace `<real ...>` values in secrets file |
| `Auth0 token request failed` | Wrong `AUTH0_DOMAIN`, `AUTH0_SMOKE_CLIENT_ID`, or `AUTH0_SMOKE_CLIENT_SECRET` |
| `token does not start with eyJ` | Auth0 returned an error body instead of a token — check credentials |
| `/api/health` or `/api/ready` FAIL | Railway backend is down — check Railway dashboard |
| `/api/ops/metrics` auth rejected (401/403) | Token expired or wrong audience — re-run launcher |
| Create Build stays in `clarifying` | Build trigger returned clarifying — add more detail in chat |
| `Build trigger endpoint is not available` | `autonomous-build/start` not deployed on this Railway instance |
| `worker unavailable` | Railway worker is not running — check Railway service logs |
| `provider unavailable` | `OPENAI_API_KEY` or similar not set in Railway environment variables |
| Browser opens but shows 401 | Token expired mid-session — re-run `npm run launch:beta:full` |
