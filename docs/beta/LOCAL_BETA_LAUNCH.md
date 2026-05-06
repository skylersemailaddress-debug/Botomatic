# Local Beta Launch

One-command launcher that fetches a fresh Auth0 token and starts the local dev UI pointed at the hosted Railway backend.

## Prerequisites

- Node.js + npm installed
- PowerShell 5.1+ (Windows built-in)
- Network access to `https://botomatic-etmt-production.up.railway.app`
- Auth0 smoke credentials (ask the team lead)

## Setup: create the secrets file

Create the file at exactly this path (outside the repo — never commit it):

```
%USERPROFILE%\Botomatic-local-secrets\beta-launch.env
```

Contents (fill in the real values):

```
AUTH0_DOMAIN=dev-7fq48efb26j44svb.us.auth0.com
AUTH0_SMOKE_CLIENT_ID=<real smoke client id>
AUTH0_SMOKE_CLIENT_SECRET=<real rotated smoke client secret>
AUTH0_AUDIENCE=https://botomatic.local/api
BOTOMATIC_BETA_BASE_URL=https://botomatic-etmt-production.up.railway.app
BOTOMATIC_BETA_PROJECT_ID=proj_1778104927509_c3181b
BOTOMATIC_BETA_USER_ID=beta-smoke-admin
BOTOMATIC_BETA_TENANT_ID=beta-smoke-tenant
NEXT_PUBLIC_API_BASE_URL=https://botomatic-etmt-production.up.railway.app
BOTOMATIC_API_BASE_URL=https://botomatic-etmt-production.up.railway.app
API_BASE_URL=https://botomatic-etmt-production.up.railway.app
```

Required keys: `AUTH0_DOMAIN`, `AUTH0_SMOKE_CLIENT_ID`, `AUTH0_SMOKE_CLIENT_SECRET`, `AUTH0_AUDIENCE`.  
All other keys fall back to safe defaults if omitted.

## Run

```powershell
cd C:\Users\<you>\Botomatic
npm run launch:beta:local
```

The launcher will:

1. Load secrets from `%USERPROFILE%\Botomatic-local-secrets\beta-launch.env`
2. Reject any placeholder or missing values before touching anything
3. Request a fresh Auth0 `client_credentials` access token
4. Validate the token starts with `eyJ` (JWT sanity check)
5. Set `BOTOMATIC_BETA_AUTH_TOKEN` and other env vars in the current process
6. Kill any processes on ports 3000, 3001, 4000
7. Clear the Next.js build cache
8. Health-check the hosted Railway API
9. Start `npm run ui:dev`
10. Open `http://localhost:3000` in your default browser

## Security notes

- **Never commit** `beta-launch.env` or any file containing `AUTH0_SMOKE_CLIENT_SECRET`.
- The `BOTOMATIC_BETA_AUTH_TOKEN` is set only in the local process environment. It is never written to disk or exposed to client-side browser code.
- The token is injected server-side by the Next.js proxy (`apps/control-plane/src/app/api/[...path]/route.ts`) — the browser never sees it.
- Rotate `AUTH0_SMOKE_CLIENT_SECRET` if it is ever accidentally exposed.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Secrets file not found` | Create `%USERPROFILE%\Botomatic-local-secrets\beta-launch.env` |
| `still contains a placeholder value` | Replace `<real ...>` values in secrets file |
| `Auth0 token request failed` | Wrong `AUTH0_DOMAIN`, `AUTH0_SMOKE_CLIENT_ID`, or `AUTH0_SMOKE_CLIENT_SECRET` |
| `token does not start with eyJ` | Auth0 returned an error body instead of a token |
| `/api/health` warn | Railway backend is down or unreachable — check Railway dashboard |
| Browser opens but shows 401 | Token expired mid-session — re-run `npm run launch:beta:local` |
