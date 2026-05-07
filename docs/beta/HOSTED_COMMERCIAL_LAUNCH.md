# Hosted Commercial Launch — Botomatic

This document describes the architecture and deployment steps for running
Botomatic as a customer-facing hosted web app on Railway with no local setup
required.

---

## Architecture

```
Customer browser
    │
    ▼
Railway service  (single deployment)
┌──────────────────────────────────────────────┐
│  Next.js control-plane UI  (port $PORT)      │
│  ├─ /               → BetaHQ                 │
│  ├─ /projects/:id   → BetaHQ                 │
│  ├─ /login          → password gate          │
│  └─ /api/*          → catch-all proxy ──────────────────────────┐
│                                              │                   │
│  Orchestrator API  (port 3001, internal)     │◄──────────────────┘
│  ├─ /api/projects/:id/intake                 │
│  ├─ /api/projects/:id/autonomous-build/start │
│  ├─ /api/projects/:id/runtime                │
│  ├─ /api/health                              │
│  └─ /api/ready                               │
└──────────────────────────────────────────────┘
         │
         ▼
   Railway secrets (Anthropic, OpenAI, Supabase, GitHub, …)
```

Both processes share the same Railway service. The Next.js catch-all proxy
(`/api/[...path]/route.ts`) forwards browser API requests to the internal
orchestrator on `localhost:3001`, injecting bearer-token auth headers.

---

## Required Railway Environment Variables

Set these on the Railway service before deploying.

### Core — orchestrator API

| Variable | Value / notes |
|---|---|
| `RUNTIME_MODE` | `commercial` |
| `PROJECT_REPOSITORY_MODE` | `durable` |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role JWT |
| `QUEUE_BACKEND` | `supabase` |
| `EXECUTOR` | `claude` |
| `GITHUB_TOKEN` | GitHub PAT for repo operations |
| `GITHUB_OWNER` | GitHub org or username |
| `GITHUB_REPO` | Target repository name |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed UI origins |
| `API_AUTH_TOKEN` | Strong random secret — used to authenticate Next.js → API calls |

### Auth — Next.js UI layer

| Variable | Value / notes |
|---|---|
| `BOTOMATIC_UI_PASSWORD` | Password customers enter on the `/login` page |
| `BOTOMATIC_API_TOKEN` | Must match `API_AUTH_TOKEN` above — injected as `Authorization: Bearer` on all server-to-API calls |
| `BOTOMATIC_BETA_USER_ID` | Actor ID recorded in audit logs (e.g. `commercial-admin`) |
| `BOTOMATIC_BETA_TENANT_ID` | Tenant ID for multi-tenant isolation (e.g. `default-tenant`) |
| `BOTOMATIC_API_PROXY_BASE_URL` | `http://localhost:3001` — tells the Next.js proxy where the API listens |

### Optional — multi-provider AI router

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `GOOGLE_AI_API_KEY` | Google Gemini |
| `GROQ_API_KEY` | Groq (Llama) |
| `DEEPSEEK_API_KEY` | Deepseek |
| `SLACK_WEBHOOK_URL` | Alert notifications |
| `BOTOMATIC_ALERT_WEBHOOK_URL` | Alert notifications |

---

## Deploy Command

Railway auto-runs the build and start defined in `railway.json`.

**Build command** (from `nixpacks.toml`):
```
npm install && npm run ui:build
```

**Start command** (`railway.json` → `package.json`):
```
npm run start:commercial
```

`start:commercial` runs `scripts/start-commercial.sh`, which:
1. Starts the orchestrator API on port **3001** (internal).
2. Waits 3 seconds for the API to initialise.
3. Starts Next.js on Railway's exposed **`$PORT`**.

---

## Auth Flow (commercial beta)

1. Customer visits `https://<your-railway-app>.up.railway.app/`.
2. Middleware (`src/middleware.ts`) checks for a valid HMAC session cookie.
3. If absent → redirect to `/login`.
4. Customer enters `BOTOMATIC_UI_PASSWORD` → POST `/api/auth/login` → httpOnly session cookie (7-day TTL).
5. All subsequent page and API requests carry the session cookie.
6. Next.js server-side route handlers resolve the actor via `BOTOMATIC_API_TOKEN` (server-only var) and forward requests to the orchestrator API with a `Bearer` token.

**No Auth0 client secret is ever sent to the browser.**
**No provider keys (OpenAI, Anthropic, etc.) are ever in the client bundle.**

---

## Smoke-Test Commands

After deployment, run these from a terminal (replace the URL):

```sh
export BASE=https://<your-app>.up.railway.app

# Health check (via Next.js proxy)
curl -s "$BASE/api/health" | jq .

# Readiness check
curl -s "$BASE/api/ready" | jq .

# Login and get a session cookie
curl -s -c /tmp/botomatic-cookies.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"<BOTOMATIC_UI_PASSWORD>"}' | jq .

# Create a project (using session cookie)
curl -s -b /tmp/botomatic-cookies.txt -X POST "$BASE/api/projects/intake" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-test","request":"Build a simple landing page"}' | jq .

# Trigger a build (replace PROJECT_ID with the value from above)
curl -s -b /tmp/botomatic-cookies.txt -X POST "$BASE/api/projects/$PROJECT_ID/build/start" \
  -H "Content-Type: application/json" \
  -d '{"inputText":"Build a simple landing page","safeDefaults":true}' | jq .
```

---

## Validate the Hosted URL

Open `https://<your-app>.up.railway.app/` in a browser:

- You should see the `/login` page (if `BOTOMATIC_UI_PASSWORD` is set).
- After login, you should see **Botomatic Beta HQ** with API/Ready status dots.
- Create a build, attach files, watch progress — no local commands needed.

---

## No Local Setup Required for Customers

Customers need only:
- A browser.
- The hosted URL.
- The access password (`BOTOMATIC_UI_PASSWORD`).

All secrets, API keys, and provider credentials remain on Railway, never
reaching the browser.
