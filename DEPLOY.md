# Commercial Deployment Guide

## Architecture

| Service | Host | Purpose |
|---|---|---|
| API + claude-runner | Railway | Orchestrator API on port 8080 |
| UI | Vercel (or second Railway service) | Next.js control plane |
| Database | Supabase | Durable project + job storage |
| Auth | Auth0 | OIDC token validation |

---

## Step 1 — Supabase schema

Run `supabase/migrations/001_init.sql` in your Supabase SQL editor:
- Creates `projects` table
- Creates `orchestrator_jobs` queue table
- Creates `claim_job` RPC (atomic job claim for workers)

Then go to **Supabase → Project Settings → Network → Network Restrictions** and clear all IP restrictions so Railway can reach it.

---

## Step 2 — Railway environment variables

Set these on your Railway service (Settings → Variables):

```
# Runtime mode
RUNTIME_MODE=commercial
PROJECT_REPOSITORY_MODE=durable
QUEUE_BACKEND=supabase
EXECUTOR=claude
CLAUDE_EXECUTOR_URL=http://127.0.0.1:4000

# AI keys
ANTHROPIC_API_KEY=<your key>
OPENAI_API_KEY=<your key>
OPENAI_PROJECT_ID=<your project id>
GEMINI_API_KEY=<your key>
GOOGLE_API_KEY=<your key>

# Model routing
NEXUS_MODEL_FLAGSHIP_PROVIDER=anthropic
NEXUS_MODEL_FLAGSHIP=claude-opus-4-7
NEXUS_MODEL_GENERAL_PROVIDER=anthropic
NEXUS_MODEL_GENERAL=claude-sonnet-4-6
NEXUS_MODEL_BRAINSTORM_PROVIDER=openai
NEXUS_MODEL_BRAINSTORM=gpt-4o
NEXUS_MODEL_UTILITY_PROVIDER=openai
NEXUS_MODEL_UTILITY=gpt-4o-mini
NEXUS_MODEL_FAST_PROVIDER=google
NEXUS_MODEL_FAST=gemini-2.0-flash
NEXUS_COUNCIL_GEMINI_MODEL=gemini-2.5-pro
NEXUS_COUNCIL_OPENAI_MODEL=gpt-4o
NEXUS_CRITIC_MODEL=gpt-4o-mini
NEXUS_CRITIC_PROVIDER=openai
NEXUS_CRITIC_THRESHOLD=0.75

# Auth0 / OIDC
OIDC_ISSUER_URL=https://dev-7fq48efb26j44svb.us.auth0.com/
OIDC_AUDIENCE=https://botomatic.local/api
OIDC_CLIENT_ID=wE9HPgWiTssRbnEdXxgPupjlQesA7Vhp
AUTH0_CLIENT_SECRET=<your secret>

# Supabase
SUPABASE_URL=<your supabase project url>
SUPABASE_SERVICE_ROLE_KEY=<required_secret_ref>

# GitHub (for repo intake / push)
GITHUB_TOKEN=<your PAT>
GITHUB_OWNER=<your org>
GITHUB_REPO=Botomatic

# Alerts
SLACK_WEBHOOK_URL=<your webhook>

# Feature flags
NEXUS_CONVERSATION_MODEL_ENABLED=true
NEXUS_COUNCIL_MODEL_ENABLED=true
```

---

## Step 3 — Vercel (UI)

1. Import `apps/control-plane` as a new Vercel project (set root directory to `apps/control-plane`)
2. Add environment variable: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-domain>`
3. Deploy — Vercel auto-builds on every push to main

### Auth0 callback URLs

Add these to your Auth0 Application settings:

- **Allowed Callback URLs**: `https://<your-vercel-domain>/api/auth/callback`
- **Allowed Logout URLs**: `https://<your-vercel-domain>`
- **Allowed Web Origins**: `https://<your-vercel-domain>`

---

## Step 4 — Verify

```bash
# API health
curl https://<railway-domain>/health

# UI
open https://<vercel-domain>
```

The API auto-falls back to in-memory mode if Supabase is unreachable, so it will boot even if the DB isn't ready yet — check the Railway logs for `supabase_connected` vs `supabase_fallback`.
