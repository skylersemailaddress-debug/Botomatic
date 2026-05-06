# Beta Deployment Smoke and Rollback

This document defines the friends-and-family beta deployment smoke check. The check is intentionally smaller than a public-launch deployment program, but it is repeatable and fail-closed: a hosted beta URL, auth token, and beta project ID must be supplied before the script can produce a passing proof.

## Command

```bash
npm run proof:deployment-smoke
```

The command writes `release-evidence/runtime/deployment_smoke_beta_proof.json` only after it has attempted the configured live HTTP checks. If required environment variables are absent or invalid, it exits non-zero and does not write a passing artifact.

## Beta environment manifest

The local manifest is `release-evidence/runtime/beta_environment_manifest.json`. It records the non-secret deployment smoke contract for private beta:

- the required environment variables the smoke script must receive;
- the default HTTP routes the script exercises;
- the rollback documentation requirement;
- the fact that secrets are supplied only via runtime environment variables and must never be committed.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `BOTOMATIC_BETA_BASE_URL` | Hosted beta API/control-plane base URL, for example `https://beta.example.com`. |
| `BOTOMATIC_BETA_AUTH_TOKEN` | Valid bearer token for the hosted beta environment. This must be supplied by the operator at runtime. |
| `BOTOMATIC_BETA_PROJECT_ID` | Existing beta project ID owned by, or accessible to, the supplied token. |

Optional overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BOTOMATIC_BETA_ENVIRONMENT_MANIFEST` | `release-evidence/runtime/beta_environment_manifest.json` | Local manifest path to verify before live smoke. |
| `BOTOMATIC_BETA_HEALTH_PATH` | `/api/health` | Health/readiness route. |
| `BOTOMATIC_BETA_SENSITIVE_PATH` | `/api/ops/metrics` | Sensitive route used for the invalid-auth negative path. |
| `BOTOMATIC_BETA_PROJECT_ROUTE` | `/api/projects/:projectId/status` | Authenticated project smoke route. `:projectId` or `{projectId}` is replaced. |
| `BOTOMATIC_BETA_AUTH_ROLE` | `admin` | Role header for bearer-token beta smoke environments that support role headers. |
| `BOTOMATIC_BETA_INVALID_AUTH_TOKEN` | `invalid-beta-smoke-token` | Invalid token sent to the sensitive route. |
| `BOTOMATIC_BETA_ROLLBACK_TESTED` | unset | Set to `true` only when a real rollback drill was performed for this beta deployment. |

## Smoke assertions

The proof generator verifies these required signals:

1. `beta_environment_manifest_present` — the beta environment manifest exists and declares the required env vars.
2. `health_endpoint_passed` — the configured health endpoint returns HTTP 2xx.
3. `auth_negative_path_passed` — invalid-auth access to a sensitive route returns HTTP 401 or 403.
4. `project_route_smoke_passed` — authenticated access to the configured project route returns HTTP 2xx.
5. `rollback_documented_or_tested` — rollback is documented here, or a real rollback drill is explicitly asserted with `BOTOMATIC_BETA_ROLLBACK_TESTED=true`.

## Rollback procedure

Use this rollback procedure for the friends-and-family beta environment:

1. Identify the last known-good beta deployment artifact, release SHA, provider deployment ID, and database migration state before promoting a new beta build.
2. Keep that known-good artifact available until the new beta deployment has completed health, auth-negative, and authenticated project-route smoke checks.
3. If the new deployment fails smoke or causes a beta-blocking regression, stop promotion and use the provider rollback control to restore the known-good deployment ID or release SHA.
4. If schema changes were included, run the documented down migration or restore the compatible migration state before reopening beta traffic.
5. Re-run the post-rollback smoke checks: health endpoint, invalid-auth sensitive route denial, and authenticated project route.
6. Record the rollback action in release evidence or set `BOTOMATIC_BETA_ROLLBACK_TESTED=true` only when the drill was actually performed.

This procedure is documentation proof only. It does not claim a rollback was exercised unless the beta operator runs a real rollback drill and records that fact in the deployment smoke proof.
