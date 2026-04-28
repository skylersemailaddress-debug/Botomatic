# REPO-001 Dirty Repo Evidence Contract

REPO-001 adds structured dirty-repo evidence to the completion contract while preserving the legacy route payload shape.

## Additive fields

- `evidenceSnapshot`: machine-readable evidence capture with `capturedAt`, `evidenceEntries`, and `completionBlockers`.
- `evidenceEntries`: flattened evidence list for clients that consume top-level arrays.
- `completionBlockers`: additive alias that mirrors completion blockers used for execution gating.

## Backward compatibility

Legacy completion-contract fields remain unchanged, including:

- `commercialLaunchBlockers`
- `recommendedCompletionPlan`
- route-level `actionResult` payload shape

This ensures existing control-plane and orchestrator consumers continue to function while new evidence-aware consumers can adopt the structured fields.
