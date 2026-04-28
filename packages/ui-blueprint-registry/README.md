# UI Blueprint Registry

## What this is
A typed registry of reusable UI blueprint definitions keyed by product/app type. Each blueprint captures page composition, component contracts, UX states, layout zones, integration slots, and policy constraints.

## What this is not
- Not a generated app engine.
- Not a deployment system.
- Not proof that any generated app is commercially or legally launch-ready.

## GEN-002 consumption path
GEN-002 can consume this registry by:
1. Resolving a blueprint ID (directly or via deterministic inference from spec text).
2. Reading page/component composition and UX-state requirements.
3. Translating integration slots and theme token recommendations into generated app scaffolding.
4. Running runtime/legal validators independently before any launch claims.

## Evidence-bound caveat
Registry definitions are planning inputs only. They do **not** constitute evidence that generated apps satisfy launch, legal, operational, or commercial readiness gates.
