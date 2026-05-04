# Wave → Builder Bridge Receipt

## Summary

The generic wave-to-builder execution bridge connects mission waves to the builder API, captures artifacts, and creates artifact-backed checkpoints.

## Implementation

### missionRunner.ts — Artifact Capture
- `WaveRunResult` extended with: `builderProjectId`, `artifactId`, `workspacePath`, `contentHash`, `buildStatus`, `runStatus`, `smokeStatus`, `filesCreated`, `validatorsRun`
- Dry-run mode returns synthetic artifact IDs and paths
- Real execution: fetches `/api/projects/{id}` to extract workspace artifacts, computes contentHash from filesCreated

### missionModel.ts — Checkpoint Fields
- `MissionCheckpoint` now includes: `workspacePath`, `artifactId`, `contentHash`, `buildStatus`, `runStatus`, `smokeStatus`, `filesCreated`, `validatorsRun`, `repairAttempts`, `proofRefs`, `nextWaveId`, `blockers`
- `MissionEvidence` includes: `artifactId`, `workspacePath`, `contentHash`

### missionContract.ts — Generic Mission Contract
- `MissionContract` with: `sourceSpecHash`, `targetArchitecture`, `assumptions[]`, `blockers[]`, `unresolvedQuestions[]`, `requiredCapabilities[]`, `requiredWaves[]`, `claimBoundary`
- High-risk questions block execution
- `buildContractFromSpec()`, `lockContract()`, `canExecuteMission()`, `isHighRiskField()`

### waveProofRules.ts — Per-Wave Proof Requirements
- 12 wave types from `repo_layout` through `fresh_clone_proof`
- Proof requirements per wave type: `file_exists`, `script_passes`, `output_shape`, `artifact_exists`, `test_passes`

## Claim

Each wave execution now produces an artifact-backed checkpoint with a content hash, build status, run status, and proof refs. The bridge is generic and works for any spec, not just Nexus.
