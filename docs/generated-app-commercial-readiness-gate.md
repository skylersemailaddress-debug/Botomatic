# Generated-App Commercial Readiness Gate (GEN-004)

## Purpose

`validateGeneratedAppCommercialReadiness(appPath, options?)` provides an evidence-bound static readiness classification for generated app output. It classifies generated apps as:

- `blocked`
- `preview_ready`
- `candidate_ready`

This gate **does not** emit launch or production readiness statuses.

## What the gate checks

The gate evaluates the following required gates:

1. `file_structure`
2. `installability_manifest`
3. `build_script_presence`
4. `test_script_presence`
5. `no_placeholder_scan`
6. `route_or_entrypoint_presence`
7. `data_model_or_storage_plan`
8. `auth_boundary_plan`
9. `integration_boundary_plan`
10. `accessibility_notes`
11. `responsive_ui_notes`
12. `error_empty_loading_states`
13. `security_notes`
14. `deployment_plan`
15. `legal_claim_boundary`

## Status semantics

- `blocked`
  - Missing app path.
  - No production-relevant file structure.
  - Critical/high placeholder findings from GEN-003.
  - Missing package manifest or route/entrypoint.
  - Missing legal claim boundary caveat.
- `preview_ready`
  - Plausible generated app structure exists.
  - No critical/high placeholder findings.
  - But still missing one or more candidate static gates (build/test/deployment/security/UX notes).
- `candidate_ready`
  - Static commercial readiness gates pass.
  - Includes caveats that runtime/deployment/legal validators are still required before launch claims.

## Why candidate-ready is not launch-ready

`candidate_ready` is intentionally narrow and static. It does not include:

- runtime command execution proof,
- deployment smoke proof,
- legal verification proof.

As a result, candidate-ready output **must not** be presented as launch-ready or production-ready.

## Relationship to GEN-003 no-placeholder validator

The commercial readiness gate integrates `validateGeneratedAppNoPlaceholders` (GEN-003).

- If no-placeholder returns any `critical` or `high` findings, status is forced to `blocked`.
- No fake app/proof generation is performed.
- Existing no-placeholder validator behavior remains intact.

## Relationship to future corpus/deployment proof

GEN-004 is a static readiness checkpoint. A future generated app corpus harness and deployment/runtime proof workflow should reassess `candidate_ready` outputs with executable evidence before any launch-readiness claim is made.
