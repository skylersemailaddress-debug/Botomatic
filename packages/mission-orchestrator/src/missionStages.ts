import type { Mission } from "./missionModel.js";
import type { MissionContract } from "./missionContract.js";

export type UserStage =
  | "understanding_spec"
  | "resolving_decisions"
  | "locking_contract"
  | "planning_mission"
  | "building_foundation"
  | "building_backend"
  | "building_ui"
  | "running_validation"
  | "repairing_issues"
  | "preparing_proof"
  | "complete";

export interface MissionProgress {
  stage: UserStage;
  stageLabel: string;
  percentComplete: number;
  currentAction: string;
  blockers: string[];
  isComplete: boolean;
  needsUserInput: boolean;
  userPrompt?: string;
}

const STAGE_LABELS: Record<UserStage, string> = {
  understanding_spec: "Understanding spec",
  resolving_decisions: "Resolving key decisions",
  locking_contract: "Locking build contract",
  planning_mission: "Planning build mission",
  building_foundation: "Building foundation",
  building_backend: "Building backend",
  building_ui: "Building UI",
  running_validation: "Running validation",
  repairing_issues: "Repairing issues",
  preparing_proof: "Preparing proof",
  complete: "Complete",
};

export function getMissionProgress(
  mission: Mission | null,
  contract: MissionContract | null
): MissionProgress {
  if (!mission) {
    return {
      stage: "understanding_spec",
      stageLabel: STAGE_LABELS.understanding_spec,
      percentComplete: 0,
      currentAction: "Analyzing the spec to understand required capabilities.",
      blockers: [],
      isComplete: false,
      needsUserInput: false,
    };
  }

  // If all waves are proven, report complete regardless of contract state
  if (mission.provenWaves === mission.totalWaves && mission.totalWaves > 0) {
    return {
      stage: "complete",
      stageLabel: STAGE_LABELS.complete,
      percentComplete: 100,
      currentAction: "All waves proven. Mission complete.",
      blockers: [],
      isComplete: true,
      needsUserInput: false,
    };
  }

  if (!contract) {
    // No contract yet — in early planning stage
    if (mission.status === "compiled" && mission.provenWaves === 0) {
      return {
        stage: "understanding_spec",
        stageLabel: STAGE_LABELS.understanding_spec,
        percentComplete: 5,
        currentAction: "Analyzing the spec to understand required capabilities.",
        blockers: [],
        isComplete: false,
        needsUserInput: false,
      };
    }
    // Mission in progress but no contract reference — derive from waves
    const { stage, pct } = deriveStageFromWaves(mission);
    return {
      stage,
      stageLabel: STAGE_LABELS[stage],
      percentComplete: pct,
      currentAction: getMissionCurrentAction(mission),
      blockers: [],
      isComplete: false,
      needsUserInput: false,
    };
  }

  if (!contract.userApproved) {
    const blocking = contract.unresolvedQuestions.filter((q) => q.blocking);
    if (blocking.length > 0) {
      return {
        stage: "resolving_decisions",
        stageLabel: STAGE_LABELS.resolving_decisions,
        percentComplete: 10,
        currentAction: `Waiting on ${blocking.length} high-risk decision(s).`,
        blockers: blocking.map((q) => `${q.field}: ${q.question}`),
        isComplete: false,
        needsUserInput: true,
        userPrompt: `Please resolve these decisions before the build can proceed:\n${blocking
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join("\n")}`,
      };
    }
    return {
      stage: "locking_contract",
      stageLabel: STAGE_LABELS.locking_contract,
      percentComplete: 15,
      currentAction: "Build contract ready for your approval.",
      blockers: [],
      isComplete: false,
      needsUserInput: true,
      userPrompt: "Review and approve the build contract to start execution.",
    };
  }

  if (mission.status === "compiled" && mission.provenWaves === 0) {
    return {
      stage: "planning_mission",
      stageLabel: STAGE_LABELS.planning_mission,
      percentComplete: 20,
      currentAction: `Mission compiled with ${mission.totalWaves} waves. Ready to execute.`,
      blockers: [],
      isComplete: false,
      needsUserInput: false,
    };
  }

  const hasFailures = mission.waves.some((w) => w.status === "failed");
  const { stage, pct } = deriveStageFromWaves(mission);

  return {
    stage: hasFailures ? "repairing_issues" : stage,
    stageLabel: STAGE_LABELS[hasFailures ? "repairing_issues" : stage],
    percentComplete: pct,
    currentAction: getMissionCurrentAction(mission),
    blockers: [],
    isComplete: mission.status === "proven",
    needsUserInput: false,
  };
}

function deriveStageFromWaves(mission: Mission): { stage: UserStage; pct: number } {
  const total = mission.totalWaves;
  const proven = mission.provenWaves;
  const pct = total > 0 ? Math.round(20 + (proven / total) * 75) : 20;

  if (proven === total) return { stage: "complete", pct: 100 };

  const running = mission.waves.find((w) => w.status === "running");
  const waveId = running?.waveId ?? mission.waves.find((w) => w.status === "pending")?.waveId ?? "";
  const id = waveId.toLowerCase();

  if (/foundation|scaffold|layout|data|schema|model|migration/.test(id)) return { stage: "building_foundation", pct };
  if (/api|contract|auth|rbac|core|runtime|business|execution/.test(id)) return { stage: "building_backend", pct };
  if (/frontend|ui|shell|admin|intelligence/.test(id)) return { stage: "building_ui", pct };
  if (/valid|test|proof|evidence/.test(id)) return { stage: "running_validation", pct };
  if (/deploy|rollback|fresh|clone/.test(id)) return { stage: "preparing_proof", pct };

  return { stage: proven > total / 2 ? "running_validation" : "building_backend", pct };
}

function getMissionCurrentAction(mission: Mission): string {
  const running = mission.waves.find((w) => w.status === "running");
  if (running) return `Running wave: ${running.name}`;
  const failed = mission.waves.find((w) => w.status === "failed");
  if (failed) return `Repairing failed wave: ${failed.name}`;
  const next = mission.waves.find((w) => w.status === "pending");
  if (next) return `Next: ${next.name} (${mission.provenWaves}/${mission.totalWaves} waves proven)`;
  return `${mission.provenWaves}/${mission.totalWaves} waves proven`;
}

export function formatUserFacingStatus(progress: MissionProgress): string {
  const lines = [
    `Stage: ${progress.stageLabel}`,
    `Progress: ${progress.percentComplete}%`,
    `Action: ${progress.currentAction}`,
  ];
  if (progress.blockers.length > 0) {
    lines.push(`Blockers (${progress.blockers.length}):`);
    progress.blockers.forEach((b) => lines.push(`  - ${b}`));
  }
  if (progress.userPrompt) lines.push(`\n${progress.userPrompt}`);
  return lines.join("\n");
}
