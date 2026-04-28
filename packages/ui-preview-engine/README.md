# UI Preview Engine (GEN-002)

## What this is
A deterministic preview-manifest generator that consumes the GEN-001 UI blueprint registry and outputs UI planning artifacts:
- selected blueprint metadata
- derived pages and component tree
- UX state coverage (empty/loading/error)
- integration slot planning
- theme token defaults
- explicit commercial/readiness caveats

## What this is not
- Not generated production app code.
- Not runtime execution logic.
- Not legal/commercial launch-readiness proof.
- Not a substitute for runtime, legal, and commercial validators.

## How it consumes UI blueprints
1. Resolve blueprint from `spec.blueprintId` when provided.
2. Otherwise infer blueprint deterministically from `productType`/`description` using registry inference.
3. Build pages/component tree directly from blueprint page/component composition.
4. Carry over accessibility, responsive behavior, no-placeholder rules, and UX states from the blueprint.
5. Merge blueprint integration slots with requested integrations.

## APIs
- `createUiPreviewManifest(spec)`
- `createUiPreviewManifestFromBlueprint(blueprintId, spec)`
- `validateUiPreviewManifest(manifest)`
- `summarizeUiPreviewManifest(manifest)`
- `maybeInferUiBlueprintForPreview(spec)`

## GEN-003 / GEN-004 forward path
- GEN-003 can consume preview manifests as structured inputs for no-placeholder generated-app validation checks.
- GEN-004 can consume preview manifests as planning context for commercial-readiness gating logic, while keeping launch claims evidence-bound and separately validated.

## Evidence-bound caveat
Preview manifests are planning output only. They are **not** generated production code and **not** launch-readiness proof. Runtime/legal/commercial validators must pass separately.
