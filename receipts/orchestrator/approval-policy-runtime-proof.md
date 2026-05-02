# Approval Policy Runtime Proof

- date: 2026-05-02
- branch: fix/orchestrator-autonomous-approval-policy
- commit: 76480bd26ce0fcaae70ee92668e2c4b73e7fabf3

## API Start Result

- command: `API_AUTH_TOKEN=dev-api-token BOTOMATIC_API_TOKEN=dev-api-token BOTOMATIC_AUTH_IMPLEMENTATION=dev PORT=3001 npm run api:dev`
- result: PASS
- evidence: API boot event emitted and `API running on 3001` logged.

## Health Check Result

- `curl -fsS http://127.0.0.1:3001/health`: FAIL (404)
- `curl -fsS http://127.0.0.1:3001/api/health`: PASS (JSON status `ok`)

## Runtime Approval Gate Verification

Direct runtime verification executed against the live API with bearer token auth.

### Safe case (autopilot)

- intake status: 200
- first operator/send route: `compile`
- second operator/send route: `plan`
- actionResult.autoApproval: `true`
- final project status: `queued`

### High-risk case

- intake status: 200
- first operator/send route: `compile`
- second operator/send route: `build_blocked`
- reason: `High-risk decisions detected: live_deployment; paid_provider. Escalating.`

## Forensic Commands

- `npm run -s test:builder-forensic:smoke`: FAIL (missing script)
- `npm run -s test:builder-forensic:100`: FAIL (missing script)
- `npm run -s test:builder-forensic:report`: FAIL (missing script)

## Metrics

- cases passed approval gate: 1
- cases reached plan: 1
- cases generated artifacts: 0

## PASS_REAL / PASS_PARTIAL Delta

- previous blocked run baseline: not present in repository receipts
- assumed baseline (blocked): PASS_REAL=0, PASS_PARTIAL=0
- current observed delta from this runtime proof: PASS_REAL +1, PASS_PARTIAL +0

## Remaining Blockers

- `/health` endpoint is not exposed (404); only `/api/health` is active.
- Builder forensic scripts are missing from npm scripts.
- `npm run -s validate:all` still fails two pre-existing UI validators:
  - Validate-Botomatic-UIReadiness
  - Validate-Botomatic-UIControlPlaneIntegration
- `npm run -s build` fails with a pre-existing UI type/import issue:
  - `requestDeploy` missing export in `@/services/launchProof` (ProDashboardToolbar/VibeDashboard).
- `npm run -s test:commercial-cockpit` fails because script is missing.
- `npx tsc --noEmit --pretty false` at repository root prints TypeScript help (no root tsconfig target provided by this command in current repo layout).
