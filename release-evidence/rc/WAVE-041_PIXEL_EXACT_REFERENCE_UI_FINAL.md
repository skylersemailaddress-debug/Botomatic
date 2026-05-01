# WAVE-041 — Pixel-Exact Reference UI Final

## Goal

Make the Pro and Vibe dashboards visually align as closely as possible with the supplied reference direction while preserving all truth-state, runtime, launch-proof, and deploy-gating behavior.

## Visual lock strategy

- Keep existing Pro/Vibe component contracts intact.
- Add final visual hooks and CSS density refinements only.
- Preserve truthful fallbacks and blocked launch/deploy states.
- Avoid fake production values or decorative operational claims.

## Reference-match focus areas

### Pro dashboard

- Dense left sidebar with brand, nav, recent projects, account block.
- Compact technical topbar with project/branch/environment selectors.
- Card grid with high-density operational panels.
- Live Application remains first-class but truthful.
- Disabled Run/Launch/Deploy controls remain visually clear.

### Vibe dashboard

- Conversational center canvas with anchored input shell.
- Compact right rail for Build Map, Project State, Live Preview, What’s Next, launch status, and activity.
- Mode pill and device switcher keep the screenshot-like app-builder feel.
- Launch remains disabled unless proof system unlocks it.

## Truth preservation

The following strings must remain available where applicable:

- No orchestration started
- No persisted state yet
- No execution run yet
- Preview unavailable
- Runtime not connected
- No launch proof yet
- Launch unavailable
- Deploy controls unavailable
- Deploy action not connected
- No build started
- Health check not run
- Service health not connected
- Database not connected
- No test run yet
- No terminal logs yet
- No commits available

## Forbidden visual shortcuts

- No fake `92%` health.
- No `All Systems Operational` claim.
- No `Ready to launch` copy.
- No `Deploy successful` or `Deployed successfully` claim.
- No hardcoded `http://localhost:3000` preview URL.

## Final acceptance

WAVE-041 is acceptable when:

1. `test:wave-041` passes.
2. Build passes.
3. Pro and Vibe retain all truth-state behavior.
4. UI density, spacing, and panel hierarchy are closer to the reference screenshots.
5. Launch/deploy remain proof-gated.
