# WAVE-039 — End-to-End Browser Acceptance

## Scope

WAVE-039 validates the browser-facing release candidate after WAVE-025 through WAVE-038. This is an acceptance and evidence wave. It does not introduce fake runtime, launch, deploy, or execution success.

## User journeys covered

1. Home entry point creates or resumes a project path.
2. Vibe dashboard loads cleanly for `/projects/default/vibe`.
3. Pro dashboard loads cleanly for `/projects/default`.
4. Deployment, evidence, and logs routes render without crashing.
5. Runtime preview renders verified backend preview only when proof exists; otherwise derived URLs remain unverified.
6. Execution, runtime, launch-proof, deploy, and rollback APIs exist and stay project-scoped.
7. Launch and deploy remain gated unless verified proof exists.

## Browser paths

- `/`
- `/projects/default/vibe`
- `/projects/default`
- `/projects/default/deployment`
- `/projects/default/evidence`
- `/projects/default/logs`

## Expected truthful states for a clean project

- `No orchestration started`
- `No persisted state yet`
- `No execution run yet`
- `Preview unavailable` or derived/unverified preview only
- `Runtime not connected` if no verified runtime exists
- `No launch proof yet`
- `Launch unavailable`
- `Deploy controls unavailable` or `Deploy action not connected`

## Expected truthful states after records exist

- Execution records may populate run/job state and logs only from allowlisted runner jobs.
- Runtime records may show verified preview only when healthcheck proof exists.
- Launch proof may become verified only when runtime proof and execution proof are present.
- Deploy remains blocked with `Deploy action not connected` unless a real deploy backend exists.
- Rollback remains blocked with `Rollback action not connected` unless a real rollback backend exists.

## Manual browser acceptance checklist

1. Start the app locally.
2. Open `/` and confirm the home route renders.
3. Open `/projects/default/vibe` and confirm the main Vibe input, Build Map, Project State, What’s Next, and Live Preview sections render.
4. Confirm clean-state fallbacks show no fake readiness.
5. Open `/projects/default` and confirm Pro panels render truthful fallbacks.
6. Open `/projects/default/deployment`, `/projects/default/evidence`, and `/projects/default/logs` and confirm no browser crash.
7. Confirm launch/deploy controls are visibly gated unless verified proof exists.
8. Confirm no visible hardcoded `http://localhost:3000` appears in Pro/Vibe UI.
9. Confirm mobile/tablet widths do not create major overflow in Pro/Vibe dashboards.
10. Confirm browser console has no fatal route-rendering errors.

## Known non-blocking advisory

- Doctor may report `NEEDS USER Launcher installed status`. This is a user-side desktop launcher installation advisory and does not block local browser acceptance if the command exits successfully.

## Remaining blockers before public release

- Manual browser QA evidence must be captured for target browsers/devices.
- Production auth/token posture still requires final owner review.
- Real external deploy backend remains intentionally not connected.
- Pixel-exact screenshot parity is deferred to WAVE-041.
