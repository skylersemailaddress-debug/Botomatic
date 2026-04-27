export { ingestComplexSpec, type SpecIngestionInput, type SpecIngestionOutput } from "./specIngestion";
export { createMilestoneGraph, type MilestoneDefinition } from "./milestonePlanner";
export { startAutonomousBuildRun, resumeAutonomousBuildRun, type StartAutonomousBuildInput, type ResumeAutonomousBuildInput } from "./buildOrchestrator";
export { createInitialCheckpoint, updateCheckpoint, type RunCheckpoint, type AutonomousBuildRunState } from "./checkpointStore";
export { runAutonomousRepairLoop, type RepairAttemptResult } from "./autonomousRepairLoop";
export { classifyBlocker, type BlockerClassification } from "./blockerClassifier";
export { evaluateHumanEscalation, type EscalationDecision } from "./humanEscalationPolicy";
export { assembleFinalReleaseBundle, type FinalReleaseBundle } from "./finalReleaseAssembler";
export {
	normalizeErrorMessage,
	createFailureSignature,
	evaluateRepairPolicy,
	buildFailureInspection,
	type FailureCategory,
	type FailureInspection,
	type RepairAttemptHistory,
	type FailureClassifierInput,
	type RepairPolicyDecision,
} from "./failurePolicy";
export {
	REPAIR_STRATEGY_REGISTRY,
	getRepairStrategyById,
	type RepairStrategy,
	type StrategyRiskLevel,
	type StrategyTarget,
} from "./repairStrategyRegistry";
export {
	readAdaptiveRepairMemory,
	writeAdaptiveRepairMemory,
	recordAdaptiveRepairOutcome,
	findSimilarAdaptiveOutcomes,
	summarizeStrategyOutcomesForSignature,
	type AdaptiveRepairOutcome,
	type AdaptiveRepairMemoryFile,
} from "./adaptiveRepairMemory";
export {
	selectAdaptiveRepairStrategy,
	getStrategiesByIds,
	type AdaptiveSelectionInput,
	type AdaptiveSelectionResult,
	type StrategyRejection,
} from "./adaptiveStrategySelector";
