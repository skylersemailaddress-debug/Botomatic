# REPO-001 Dirty Repo Evidence Contract

REPO-001 adds structured dirty-repo evidence to the completion contract while preserving the legacy route payload shape.

## Additive fields

- `completionContract.evidenceSnapshot` includes:
  - `evidenceSnapshot.entries`
  - `evidenceSnapshot.summary` (with `totalEntries`, `bySeverity`, `byCategory`)
- `completionContract.evidenceEntries` mirrors `completionContract.evidenceSnapshot.entries`.
- `completionContract.completionBlockers` mirrors derived `completionBlockers` generated from evidence entries.

## Backward compatibility

Legacy completion-contract fields remain unchanged, including:

- `commercialLaunchBlockers`
- `recommendedCompletionPlan`
- route-level `actionResult` payload shape

This ensures existing control-plane and orchestrator consumers continue to function while new evidence-aware consumers can adopt the structured fields.
