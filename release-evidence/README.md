# Release Evidence Bundle

Purpose: canonical structure for final launch evidence.

## Required bundle contents

- release-evidence/manifest.json
- docs/gate4/GATE4_RUNTIME_PROOF_2026-04-23.md
- docs/gate5/GATE5_RUNTIME_PROOF_2026-04-23.md
- docs/gate6/GATE6_RUNTIME_PROOF_2026-04-23.md
- LAUNCH_BLOCKERS.md
- VALIDATION_MATRIX.md
- READINESS_SCORECARD.json
- BOTOMATIC_FINAL_CLOSURE_PROGRAM.md

## Rules

- Every gate marked closed by proof must map to a proof artifact in manifest.json.
- Any gate without runtime proof must remain open.
- Final launch claim is forbidden while any P0 blocker remains open.
